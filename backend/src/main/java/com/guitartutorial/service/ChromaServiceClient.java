package com.guitartutorial.service;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.guitartutorial.dto.SearchResultDto;
import com.guitartutorial.entity.TutorialMetadata;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * HTTP client for the ChromaDB Python service.
 * Communicates with the chroma_service.py HTTP server.
 */
@Service
public class ChromaServiceClient {

    private static final Logger log = LoggerFactory.getLogger(ChromaServiceClient.class);

    private final String chromaServiceUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ChromaServiceClient(
            @Value("${chroma.service.url:http://localhost:8001}") String chromaServiceUrl) {
        this.chromaServiceUrl = chromaServiceUrl;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Index tutorial text chunks into ChromaDB.
     */
    public void indexTutorial(String tutorialId, String[] chunks, TutorialMetadata metadata) {
        if (chunks == null || chunks.length == 0) {
            log.warn("No chunks to index for tutorial '{}'", tutorialId);
            return;
        }

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("tutorialId", tutorialId);
        requestBody.put("chunks", List.of(chunks));

        Map<String, String> metadataMap = new HashMap<>();
        metadataMap.put("title", metadata.getTitle() != null ? metadata.getTitle() : "");
        metadataMap.put("difficulty", metadata.getDifficulty() != null ? metadata.getDifficulty() : "");
        metadataMap.put("genre", metadata.getGenre() != null ? metadata.getGenre() : "");
        metadataMap.put("techniques", metadata.getTechniques() != null ? metadata.getTechniques() : "");
        metadataMap.put("tuning", metadata.getTuning() != null ? metadata.getTuning() : "");
        metadataMap.put("musicalKey", metadata.getMusicalKey() != null ? metadata.getMusicalKey() : "");
        requestBody.put("metadata", metadataMap);

        post("/index", requestBody);
    }

    /**
     * Search across indexed tutorials.
     *
     * @param query    the search query text
     * @param nResults max number of results
     * @return list of search results
     */
    public List<SearchResultDto> search(String query, int nResults) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("query", query);
        requestBody.put("nResults", nResults);

        try {
            JsonNode response = post("/search", requestBody);
            if (response == null || !response.has("results")) {
                return List.of();
            }

            List<Map<String, Object>> results = objectMapper.convertValue(
                    response.get("results"),
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            // Group by tutorialId and aggregate
            Map<String, SearchResultDto.Builder> builders = new HashMap<>();

            for (Map<String, Object> result : results) {
                String tid = (String) result.getOrDefault("tutorialId", "");
                if (tid.isEmpty()) continue;

                SearchResultDto.Builder builder = builders.computeIfAbsent(tid, k ->
                        SearchResultDto.builder()
                                .tutorialId(tid)
                                .title((String) result.getOrDefault("title", ""))
                                .tuning((String) result.getOrDefault("tuning", ""))
                                .musicalKey((String) result.getOrDefault("musicalKey", ""))
                                .difficulty((String) result.getOrDefault("difficulty", ""))
                                .techniques((String) result.getOrDefault("techniques", ""))
                                .genre((String) result.getOrDefault("genre", ""))
                                .matchedChunks(new ArrayList<>())
                );

                double score = ((Number) result.getOrDefault("relevanceScore", 0.0)).doubleValue();
                builder.relevanceScore(score);

                String chunk = (String) result.getOrDefault("chunk", "");
                if (!chunk.isEmpty()) {
                    List<String> chunks = new ArrayList<>(builder.build().matchedChunks());
                    chunks.add(chunk);
                    builder.matchedChunks(chunks);
                }
            }

            return builders.values().stream()
                    .map(SearchResultDto.Builder::build)
                    .sorted((a, b) -> Double.compare(b.relevanceScore(), a.relevanceScore()))
                    .toList();

        } catch (Exception e) {
            log.warn("ChromaDB search failed: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Check if the ChromaDB service is reachable.
     */
    public boolean isHealthy() {
        try {
            JsonNode response = get("/health");
            return response != null && "ok".equals(response.get("status").asText());
        } catch (Exception e) {
            return false;
        }
    }

    private JsonNode post(String path, Map<String, Object> body) {
        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(chromaServiceUrl + path))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return objectMapper.readTree(response.body());
            } else {
                log.warn("ChromaDB service returned {} for POST {}: {}",
                        response.statusCode(), path, response.body());
                return null;
            }
        } catch (Exception e) {
            log.warn("ChromaDB service call failed for POST {}: {}", path, e.getMessage());
            return null;
        }
    }

    private JsonNode get(String path) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(chromaServiceUrl + path))
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return objectMapper.readTree(response.body());
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
