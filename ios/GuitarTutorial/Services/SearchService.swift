import Foundation

/// Service for semantic search across tutorials.
final class SearchService {
    static let shared = SearchService()

    private let client = APIClient.shared

    private init() {}

    func search(query: String, nResults: Int = AppEnvironment.maxSearchResults) async throws -> SearchResponse {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        return try await client.get("/api/tutorials/search?q=\(encoded)&n=\(nResults)")
    }

    func health() async throws -> [String: String] {
        try await client.get("/api/tutorials/search/health")
    }
}
