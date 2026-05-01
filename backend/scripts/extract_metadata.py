#!/usr/bin/env python3
"""
Extract structured metadata from guitar tutorial PDF text using Ollama/Mistral.

Usage:
    python extract_metadata.py <pdf_text_file> <output_json_path> [--ollama-url URL] [--model MODEL]

Reads the extracted plain text from a PDF, sends it to Mistral (via Ollama),
and asks the LLM to return structured JSON with:
    - title
    - tuning
    - key (musicalKey)
    - difficulty
    - techniques (comma-separated list)
    - genre/style

The JSON is written to the output path.
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error


OLLAMA_URL_DEFAULT = "http://localhost:11434"
MODEL_DEFAULT = "mistral"

SYSTEM_PROMPT = """You are a music theory expert specializing in guitar tablature analysis.
Extract structured metadata from the guitar tutorial text provided by the user.

Return ONLY valid JSON with these exact fields (no markdown, no code fences):
{
  "title": "Song title or 'Unknown'",
  "tuning": "Guitar tuning (e.g. 'Standard', 'Drop D', 'Open G', 'Half step down')",
  "musicalKey": "Musical key (e.g. 'C major', 'A minor', 'E minor')",
  "difficulty": "One of: Beginner, Intermediate, Advanced",
  "techniques": "Comma-separated list of techniques (e.g. 'fingerpicking, bends, barre chords, palm muting, slides, hammer-ons, pull-offs')",
  "genre": "Genre or style (e.g. 'Rock', 'Blues', 'Folk', 'Metal', 'Jazz')"
}

If you cannot determine a field, use null. Be concise and accurate."""


def extract_metadata(
    pdf_text: str,
    output_path: str,
    ollama_url: str = OLLAMA_URL_DEFAULT,
    model: str = MODEL_DEFAULT,
) -> dict:
    """
    Send PDF text to Mistral via Ollama and parse the structured JSON response.

    Returns the parsed metadata dict.
    """
    prompt = f"Here is the guitar tutorial text:\n\n{pdf_text}\n\nExtract the metadata."

    payload = {
        "model": model,
        "prompt": prompt,
        "system": SYSTEM_PROMPT,
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 1024,
        },
    }

    url = f"{ollama_url.rstrip('/')}/api/generate"
    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    print(f"Sending request to Ollama ({ollama_url}) with model '{model}'...", flush=True)
    start_time = time.time()

    try:
        with urllib.request.urlopen(req, timeout=300) as response:
            response_body = response.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        print(f"Ollama HTTP error: {e.code} {e.reason}", file=sys.stderr, flush=True)
        print(f"Response: {e.read().decode('utf-8', errors='replace')}", file=sys.stderr, flush=True)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(
            f"Cannot connect to Ollama at {ollama_url}: {e.reason}",
            file=sys.stderr,
            flush=True,
        )
        print("Make sure Ollama is running and the model is pulled.", file=sys.stderr, flush=True)
        sys.exit(1)

    elapsed = time.time() - start_time
    print(f"Ollama responded in {elapsed:.1f}s", flush=True)

    try:
        result = json.loads(response_body)
        raw_text = result.get("response", "")
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Failed to parse Ollama response: {e}", file=sys.stderr, flush=True)
        print(f"Raw response: {response_body[:500]}", file=sys.stderr, flush=True)
        sys.exit(1)

    # Try to parse JSON from the response text
    metadata = _parse_llm_json(raw_text)

    # Add raw response for debugging
    metadata["_rawLlmResponse"] = raw_text

    # Write output
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"Metadata written to: {output_path}", flush=True)
    return metadata


def _parse_llm_json(raw_text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code fences."""
    text = raw_text.strip()

    # Try to find JSON within markdown code fences
    if "```json" in text:
        text = text.split("```json", 1)[1]
        if "```" in text:
            text = text.split("```", 1)[0]
    elif "```" in text:
        text = text.split("```", 1)[1]
        if "```" in text:
            text = text.split("```", 1)[0]

    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find a JSON object with braces
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

        print(f"Warning: Could not parse JSON from LLM response", file=sys.stderr, flush=True)
        print(f"Response text: {raw_text[:500]}", file=sys.stderr, flush=True)
        return {
            "title": None,
            "tuning": None,
            "musicalKey": None,
            "difficulty": None,
            "techniques": None,
            "genre": None,
        }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract structured metadata from guitar tutorial PDF text using Mistral/Ollama"
    )
    parser.add_argument("pdf_text_file", help="Path to the extracted PDF text file")
    parser.add_argument("output_json_path", help="Path for the output JSON metadata file")
    parser.add_argument(
        "--ollama-url",
        default=OLLAMA_URL_DEFAULT,
        help=f"Ollama server URL (default: {OLLAMA_URL_DEFAULT})",
    )
    parser.add_argument(
        "--model",
        default=MODEL_DEFAULT,
        help=f"Ollama model name (default: {MODEL_DEFAULT})",
    )

    args = parser.parse_args()

    if not os.path.isfile(args.pdf_text_file):
        print(f"Error: PDF text file not found: {args.pdf_text_file}", file=sys.stderr, flush=True)
        sys.exit(1)

    with open(args.pdf_text_file, "r", encoding="utf-8") as f:
        pdf_text = f.read()

    if not pdf_text.strip():
        print("Error: PDF text file is empty", file=sys.stderr, flush=True)
        sys.exit(1)

    extract_metadata(
        pdf_text=pdf_text,
        output_path=args.output_json_path,
        ollama_url=args.ollama_url,
        model=args.model,
    )


if __name__ == "__main__":
    main()
