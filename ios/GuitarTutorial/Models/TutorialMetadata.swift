import Foundation

/// Metadata extracted from a PDF tutorial via Mistral/Ollama.
struct TutorialMetadata: Codable {
    let tutorialId: String
    let title: String?
    let tuning: String?
    let musicalKey: String?
    let difficulty: String?
    let techniques: String?
    let genre: String?
    let extractedAt: String
}

/// A single search result from ChromaDB semantic search.
struct SearchResult: Codable, Identifiable {
    var id: String { tutorialId }
    let tutorialId: String
    let title: String?
    let name: String
    let tuning: String?
    let musicalKey: String?
    let difficulty: String?
    let techniques: String?
    let genre: String?
    let hasSubtitle: Bool
    let hasTablature: Bool
    let relevanceScore: Double
    let matchedChunks: [String]
}

/// Response wrapper for search results.
struct SearchResponse: Codable {
    let query: String
    let results: [SearchResult]
    let totalResults: Int
}
