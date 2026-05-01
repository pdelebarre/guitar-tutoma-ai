#!/usr/bin/env python3
"""
ChromaDB service for indexing and searching guitar tutorial content.

This script runs as a persistent HTTP server that the Java backend communicates with.
It manages:
  - Indexing PDF text chunks with their metadata
  - Semantic search across indexed tutorials

Endpoints:
  POST /index    - Index text chunks for a tutorial
  POST /search   - Search across indexed tutorials
  GET  /health   - Health check

Usage:
    python chroma_service.py [--port PORT] [--persist-dir DIR]
"""

import argparse
import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Lazy import so the script can fail gracefully if chromadb is not installed
try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    print("Error: chromadb is not installed. Install with: pip install chromadb", file=sys.stderr)
    sys.exit(1)


DEFAULT_PORT = 8001
DEFAULT_PERSIST_DIR = "./chroma_data"
COLLECTION_NAME = "guitar_tutorials"


class ChromaServiceHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        """Override to use stderr so stdout stays clean for potential pipe usage."""
        sys.stderr.write(f"[chroma] {args[0]} {args[1]} {args[2]}\n")

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        raw = self.rfile.read(content_length)
        return json.loads(raw.decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self._send_json(200, {"status": "ok"})
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/index":
            self._handle_index()
        elif parsed.path == "/search":
            self._handle_search()
        else:
            self._send_json(404, {"error": "Not found"})

    def _get_collection(self):
        """Get or create the ChromaDB collection."""
        return self.server.chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def _handle_index(self):
        try:
            body = self._read_body()
        except (json.JSONDecodeError, ValueError):
            self._send_json(400, {"error": "Invalid JSON"})
            return

        tutorial_id = body.get("tutorialId")
        chunks = body.get("chunks", [])
        metadata = body.get("metadata", {})

        if not tutorial_id or not chunks:
            self._send_json(400, {"error": "tutorialId and chunks are required"})
            return

        collection = self._get_collection()

        # Remove existing documents for this tutorial (re-index)
        existing = collection.get(where={"tutorialId": tutorial_id})
        if existing and existing.get("ids"):
            collection.delete(ids=existing["ids"])

        # Prepare documents
        ids = []
        documents = []
        metadatas = []

        for i, chunk in enumerate(chunks):
            chunk_id = f"{tutorial_id}_{i}"
            ids.append(chunk_id)
            documents.append(chunk)
            metadatas.append({
                "tutorialId": tutorial_id,
                "chunkIndex": i,
                "title": metadata.get("title", ""),
                "difficulty": metadata.get("difficulty", ""),
                "genre": metadata.get("genre", ""),
                "techniques": metadata.get("techniques", ""),
                "tuning": metadata.get("tuning", ""),
                "musicalKey": metadata.get("musicalKey", ""),
            })

        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )

        self._send_json(200, {
            "status": "ok",
            "tutorialId": tutorial_id,
            "chunksIndexed": len(chunks),
        })

    def _handle_search(self):
        try:
            body = self._read_body()
        except (json.JSONDecodeError, ValueError):
            self._send_json(400, {"error": "Invalid JSON"})
            return

        query = body.get("query", "")
        n_results = min(body.get("nResults", 10), 50)

        if not query.strip():
            self._send_json(400, {"error": "query is required"})
            return

        collection = self._get_collection()

        try:
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            self._send_json(500, {"error": f"Search failed: {str(e)}"})
            return

        # Format results
        formatted = []
        if results and results.get("ids") and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i] if results.get("metadatas") else {}
                distance = results["distances"][0][i] if results.get("distances") else 0.0
                # Convert distance (cosine) to a similarity score (1 - distance)
                relevance = round(1.0 - float(distance), 4)

                formatted.append({
                    "id": doc_id,
                    "tutorialId": metadata.get("tutorialId", ""),
                    "chunk": results["documents"][0][i] if results.get("documents") else "",
                    "title": metadata.get("title", ""),
                    "difficulty": metadata.get("difficulty", ""),
                    "genre": metadata.get("genre", ""),
                    "techniques": metadata.get("techniques", ""),
                    "tuning": metadata.get("tuning", ""),
                    "musicalKey": metadata.get("musicalKey", ""),
                    "relevanceScore": relevance,
                })

        self._send_json(200, {
            "results": formatted,
            "query": query,
        })


class ChromaServer(HTTPServer):
    """Custom HTTPServer that holds a reference to the ChromaDB client."""

    def __init__(self, server_address, RequestHandlerClass, persist_dir: str):
        self.persist_dir = persist_dir
        os.makedirs(persist_dir, exist_ok=True)

        self.chroma_client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        super().__init__(server_address, RequestHandlerClass)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ChromaDB HTTP service for guitar tutorial search"
    )
    parser.add_argument(
        "--port", type=int, default=DEFAULT_PORT,
        help=f"Port to listen on (default: {DEFAULT_PORT})",
    )
    parser.add_argument(
        "--persist-dir", default=DEFAULT_PERSIST_DIR,
        help=f"ChromaDB persistence directory (default: {DEFAULT_PERSIST_DIR})",
    )

    args = parser.parse_args()

    server = ChromaServer(("0.0.0.0", args.port), ChromaServiceHandler, args.persist_dir)
    print(f"ChromaDB service listening on port {args.port}, persist dir: {args.persist_dir}", flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...", flush=True)
        server.shutdown()


if __name__ == "__main__":
    main()
