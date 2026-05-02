package com.guitartutorial.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.guitartutorial.dto.TutorialMetadataDto;
import com.guitartutorial.entity.TutorialMetadata;
import com.guitartutorial.repository.TutorialMetadataRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service that orchestrates PDF text extraction and metadata extraction via Mistral/Ollama.
 * <p>
 * Flow:
 * 1. Extract text from PDF using PdfProcessingService
 * 2. Write extracted text to a temp file
 * 3. Invoke Python script (extract_metadata.py) which calls Ollama/Mistral
 * 4. Parse the resulting JSON and persist to PostgreSQL via TutorialMetadataRepository
 * 5. Index text chunks into ChromaDB
 */
@Service
public class MetadataExtractionService {

    private static final Logger log = LoggerFactory.getLogger(MetadataExtractionService.class);

    private static final int CHUNK_SIZE = 1000; // characters per chunk for ChromaDB

    private final PdfProcessingService pdfProcessingService;
    private final TutorialMetadataRepository metadataRepository;
    private final ChromaServiceClient chromaServiceClient;
    private final Path scriptsDirectory;
    private final String ollamaUrl;
    private final String ollamaModel;
    private final ObjectMapper objectMapper;

    public MetadataExtractionService(
            PdfProcessingService pdfProcessingService,
            TutorialMetadataRepository metadataRepository,
            ChromaServiceClient chromaServiceClient,
            @Value("${ollama.url:http://localhost:11434}") String ollamaUrl,
            @Value("${ollama.model:mistral}") String ollamaModel,
            @Value("${scripts.directory:scripts}") String scriptsDirectoryPath) {
        this.pdfProcessingService = pdfProcessingService;
        this.metadataRepository = metadataRepository;
        this.chromaServiceClient = chromaServiceClient;
        this.scriptsDirectory = Paths.get(scriptsDirectoryPath);
        this.ollamaUrl = ollamaUrl;
        this.ollamaModel = ollamaModel;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Process a PDF file: extract text, get metadata from Mistral, persist to DB, index in ChromaDB.
     *
     * @param tutorialId the tutorial directory name
     * @param pdfPath    path to the PDF file
     * @return the extracted metadata DTO
     * @throws IOException if processing fails
     */
    public TutorialMetadataDto processPdf(String tutorialId, Path pdfPath) throws IOException {
        log.info("Processing PDF for tutorial '{}': {}", tutorialId, pdfPath);

        // 1. Extract text from PDF
        String pdfText = pdfProcessingService.extractText(pdfPath);

        // 2. Write extracted text to a temp file for the Python script
        Path tutorialDir = pdfPath.getParent();
        Path textFile = tutorialDir.resolve(tutorialId + "_extracted.txt");
        Files.writeString(textFile, pdfText, StandardCharsets.UTF_8);

        // 3. Invoke Python script to extract metadata via Mistral
        Path metadataJsonFile = tutorialDir.resolve(tutorialId + "_metadata.json");
        invokeMetadataScript(textFile, metadataJsonFile);

        // 4. Parse the resulting JSON
        TutorialMetadata metadata = parseMetadataJson(tutorialId, metadataJsonFile);

        // 5. Save to PostgreSQL
        TutorialMetadata saved = metadataRepository.save(metadata);
        log.info("Metadata saved for tutorial '{}': title={}, difficulty={}, genre={}",
                tutorialId, saved.getTitle(), saved.getDifficulty(), saved.getGenre());

        // 6. Chunk text and index into ChromaDB
        String[] chunks = pdfProcessingService.chunkText(pdfText, CHUNK_SIZE);
        try {
            chromaServiceClient.indexTutorial(tutorialId, chunks, saved);
            metadata.setIndexedInChroma(true);
            metadataRepository.save(metadata);
            log.info("Indexed {} chunks into ChromaDB for tutorial '{}'", chunks.length, tutorialId);
        } catch (Exception e) {
            log.warn("Failed to index into ChromaDB for tutorial '{}': {}", tutorialId, e.getMessage());
        }

        // Clean up temp files
        try {
            Files.deleteIfExists(textFile);
            Files.deleteIfExists(metadataJsonFile);
        } catch (IOException e) {
            log.debug("Could not clean up temp files for tutorial '{}'", tutorialId);
        }

        return toDto(saved);
    }

    /**
     * Get existing metadata for a tutorial.
     */
    public Optional<TutorialMetadataDto> getMetadata(String tutorialId) {
        return metadataRepository.findByTutorialId(tutorialId)
                .map(this::toDto);
    }

    /**
     * Check if metadata already exists for a tutorial.
     */
    public boolean hasMetadata(String tutorialId) {
        return metadataRepository.existsByTutorialId(tutorialId);
    }

    private void invokeMetadataScript(Path textFile, Path outputJsonFile) throws IOException {
        Path scriptPath = scriptsDirectory.resolve("extract_metadata.py").normalize();
        if (!Files.exists(scriptPath)) {
            log.warn("Metadata extraction script not found at: {}", scriptPath.toAbsolutePath());
            throw new IOException("Script not found: " + scriptPath);
        }

        // Validate that resolved paths are within the expected directories
        Path normalizedTextFile = textFile.toAbsolutePath().normalize();
        Path normalizedOutputFile = outputJsonFile.toAbsolutePath().normalize();
        Path normalizedScriptPath = scriptPath.toAbsolutePath().normalize();

        // Determine the tutorials base directory from the text file's parent (tutorial directory)
        Path tutorialsBaseDir = normalizedTextFile.getParent();
        if (tutorialsBaseDir == null || !normalizedTextFile.startsWith(tutorialsBaseDir)) {
            log.warn("Path traversal detected: text file {} is outside expected directory", textFile);
            throw new IOException("Invalid text file path");
        }
        if (!normalizedOutputFile.startsWith(tutorialsBaseDir)) {
            log.warn("Path traversal detected: output file {} is outside expected directory", outputJsonFile);
            throw new IOException("Invalid output file path");
        }

        log.debug("Using paths - script: {}, text: {}, output: {}",
                normalizedScriptPath, normalizedTextFile, normalizedOutputFile);

        ProcessBuilder pb = new ProcessBuilder(
                "python3",
                normalizedScriptPath.toString(),
                normalizedTextFile.toString(),
                normalizedOutputFile.toString(),
                "--ollama-url", ollamaUrl,
                "--model", ollamaModel
        );

        pb.redirectErrorStream(true);

        log.info("Starting metadata extraction via Mistral for text file: {}", normalizedTextFile);

        Process process = pb.start();

        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
                log.debug("[extract_metadata] {}", line);
            }
        }

        try {
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                log.warn("Metadata extraction script exited with code {}:\n{}", exitCode, output);
                throw new IOException("Metadata extraction failed with exit code " + exitCode);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Metadata extraction interrupted", e);
        }

        if (!Files.exists(outputJsonFile)) {
            throw new IOException("Metadata extraction did not produce output file: " + outputJsonFile);
        }
    }

    private TutorialMetadata parseMetadataJson(String tutorialId, Path jsonFile) throws IOException {
        String jsonContent = Files.readString(jsonFile, StandardCharsets.UTF_8);
        JsonNode root = objectMapper.readTree(jsonContent);

        String rawResponse = root.has("_rawLlmResponse") ? root.get("_rawLlmResponse").asText() : null;

        return TutorialMetadata.builder()
                .tutorialId(tutorialId)
                .title(getTextOrNull(root, "title"))
                .tuning(getTextOrNull(root, "tuning"))
                .musicalKey(getTextOrNull(root, "musicalKey"))
                .difficulty(getTextOrNull(root, "difficulty"))
                .techniques(getTextOrNull(root, "techniques"))
                .genre(getTextOrNull(root, "genre"))
                .rawLlmResponse(rawResponse)
                .extractedAt(LocalDateTime.now())
                .indexedInChroma(false)
                .build();
    }

    private String getTextOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) return null;
        String text = value.asText();
        return (text == null || text.isBlank() || "null".equals(text)) ? null : text;
    }

    private TutorialMetadataDto toDto(TutorialMetadata entity) {
        return new TutorialMetadataDto(
                entity.getTutorialId(),
                entity.getTitle(),
                entity.getTuning(),
                entity.getMusicalKey(),
                entity.getDifficulty(),
                entity.getTechniques(),
                entity.getGenre(),
                entity.getExtractedAt()
        );
    }
}
