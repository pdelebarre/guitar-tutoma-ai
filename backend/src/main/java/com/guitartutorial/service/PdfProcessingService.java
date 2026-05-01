package com.guitartutorial.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Service for extracting plain text from PDF files using Apache PDFBox.
 */
@Service
public class PdfProcessingService {

    private static final Logger log = LoggerFactory.getLogger(PdfProcessingService.class);

    /**
     * Extracts all text from a PDF file.
     *
     * @param pdfPath path to the PDF file
     * @return the extracted plain text
     * @throws IOException if the PDF cannot be read
     */
    public String extractText(Path pdfPath) throws IOException {
        log.info("Extracting text from PDF: {}", pdfPath);
        long startTime = System.currentTimeMillis();

        try (PDDocument document = Loader.loadPDF(pdfPath.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);

            long duration = System.currentTimeMillis() - startTime;
            log.info("PDF text extraction completed in {}ms ({} pages, {} chars)",
                    duration, document.getNumberOfPages(), text.length());

            return text;
        }
    }

    /**
     * Extracts all text from a PDF input stream.
     *
     * @param pdfInputStream input stream of the PDF
     * @param filename       original filename for logging
     * @return the extracted plain text
     * @throws IOException if the PDF cannot be read
     */
    public String extractText(InputStream pdfInputStream, String filename) throws IOException {
        log.info("Extracting text from PDF stream: {}", filename);
        long startTime = System.currentTimeMillis();

        try (PDDocument document = Loader.loadPDF(pdfInputStream.readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);

            long duration = System.currentTimeMillis() - startTime;
            log.info("PDF text extraction completed in {}ms ({} pages, {} chars)",
                    duration, document.getNumberOfPages(), text.length());

            return text;
        }
    }

    /**
     * Splits extracted text into chunks of approximately {@code chunkSize} characters,
     * trying to break at paragraph boundaries.
     *
     * @param text      the full extracted text
     * @param chunkSize target chunk size in characters
     * @return array of text chunks
     */
    public String[] chunkText(String text, int chunkSize) {
        if (text == null || text.isBlank()) {
            return new String[0];
        }

        // Split by double newlines (paragraphs) first
        String[] paragraphs = text.split("\\n\\s*\\n");

        java.util.ArrayList<String> chunks = new java.util.ArrayList<>();
        StringBuilder currentChunk = new StringBuilder();

        for (String para : paragraphs) {
            String trimmed = para.trim();
            if (trimmed.isEmpty()) continue;

            if (currentChunk.length() + trimmed.length() > chunkSize && !currentChunk.isEmpty()) {
                chunks.add(currentChunk.toString().trim());
                currentChunk = new StringBuilder();
            }

            if (currentChunk.length() > 0) {
                currentChunk.append("\n\n");
            }
            currentChunk.append(trimmed);
        }

        if (!currentChunk.isEmpty()) {
            chunks.add(currentChunk.toString().trim());
        }

        return chunks.toArray(new String[0]);
    }
}
