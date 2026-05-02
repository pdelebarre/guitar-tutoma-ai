package com.guitartutorial.controller;

import com.guitartutorial.dto.SearchResultDto;
import com.guitartutorial.dto.TutorialMetadataDto;
import com.guitartutorial.exception.ResourceNotFoundException;
import com.guitartutorial.service.ChromaServiceClient;
import com.guitartutorial.service.MetadataExtractionService;
import com.guitartutorial.service.TutorialScannerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Controller for PDF upload, metadata extraction, and semantic search.
 */
@RestController
@RequestMapping("/api/tutorials")
public class PdfController {

    private static final Logger log = LoggerFactory.getLogger(PdfController.class);

    private final MetadataExtractionService metadataExtractionService;
    private final ChromaServiceClient chromaServiceClient;
    private final TutorialScannerService tutorialScannerService;
    private final Path tutorialsDirectory;

    public PdfController(
            MetadataExtractionService metadataExtractionService,
            ChromaServiceClient chromaServiceClient,
            TutorialScannerService tutorialScannerService,
            @Value("${tutorials.directory}") String tutorialsDirectoryPath) {
        this.metadataExtractionService = metadataExtractionService;
        this.chromaServiceClient = chromaServiceClient;
        this.tutorialScannerService = tutorialScannerService;
        this.tutorialsDirectory = Paths.get(tutorialsDirectoryPath).toAbsolutePath().normalize();
    }

    /**
     * Upload a PDF tablature file for a tutorial and trigger metadata extraction.
     * <p>
     * POST /api/tutorials/{id}/pdf
     *
     * @param id   the tutorial directory name
     * @param file the PDF file to upload
     * @return the extracted metadata
     */
    @PostMapping(value = "/{id}/pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TutorialMetadataDto> uploadPdf(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        boolean isPdf = "application/pdf".equals(contentType)
                || (originalFilename != null && originalFilename.toLowerCase().endsWith(".pdf"));
        if (!isPdf) {
            return ResponseEntity.badRequest().build();
        }

        try {
            // Ensure tutorial directory exists
            Path tutorialDir = tutorialsDirectory.resolve(id);
            Files.createDirectories(tutorialDir);

            // Save the uploaded PDF
            String filename = file.getOriginalFilename();
            if (filename == null || !filename.toLowerCase().endsWith(".pdf")) {
                filename = "tablature.pdf";
            }
            Path pdfPath = tutorialDir.resolve(filename);
            file.transferTo(pdfPath.toFile());
            log.info("PDF uploaded for tutorial '{}': {}", id, pdfPath);

            // Trigger metadata extraction (text extraction -> Mistral -> PostgreSQL -> ChromaDB)
            TutorialMetadataDto metadata = metadataExtractionService.processPdf(id, pdfPath);

            return ResponseEntity.ok(metadata);

        } catch (IOException e) {
            log.error("Failed to process PDF upload for tutorial '{}': {}", id, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get extracted metadata for a tutorial.
     * <p>
     * GET /api/tutorials/{id}/metadata
     */
    @GetMapping("/{id}/metadata")
    public ResponseEntity<TutorialMetadataDto> getMetadata(@PathVariable String id) {
        return metadataExtractionService.getMetadata(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No metadata found for tutorial: " + id));
    }

    /**
     * Search across all indexed tutorials using semantic search.
     * <p>
     * GET /api/tutorials/search?q=query
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam("q") String query,
            @RequestParam(value = "n", defaultValue = "10") int nResults) {

        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Query parameter 'q' is required"));
        }

        List<SearchResultDto> results = chromaServiceClient.search(query, Math.min(nResults, 50));

        // Enrich results with tutorial info (name, hasSubtitle, hasTablature)
        List<SearchResultDto> enrichedResults = new ArrayList<>(results.size());
        for (SearchResultDto r : results) {
            var tutorialOpt = tutorialScannerService.getTutorial(r.tutorialId());
            if (tutorialOpt.isPresent()) {
                var tutorial = tutorialOpt.get();
                enrichedResults.add(new SearchResultDto(
                        r.tutorialId(), r.title(), tutorial.name(),
                        r.tuning(), r.musicalKey(), r.difficulty(),
                        r.techniques(), r.genre(),
                        tutorial.hasSubtitle(), tutorial.hasTablature(),
                        r.relevanceScore(), r.matchedChunks()
                ));
            } else {
                enrichedResults.add(r);
            }
        }

        return ResponseEntity.ok(Map.of(
                "query", query,
                "results", enrichedResults,
                "totalResults", enrichedResults.size()
        ));
    }

    /**
     * Health check for the ChromaDB service.
     * <p>
     * GET /api/tutorials/search/health
     */
    @GetMapping("/search/health")
    public ResponseEntity<Map<String, Object>> searchHealth() {
        boolean chromaHealthy = chromaServiceClient.isHealthy();
        return ResponseEntity.ok(Map.of(
                "chromaService", chromaHealthy ? "healthy" : "unreachable",
                "status", chromaHealthy ? "ok" : "degraded"
        ));
    }
}
