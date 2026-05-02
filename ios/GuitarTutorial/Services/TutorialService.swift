import Foundation

/// Service for tutorial CRUD, video/subtitle URLs, and metadata.
final class TutorialService {
    static let shared = TutorialService()

    private let client = APIClient.shared

    private init() {}

    // MARK: - Tutorial CRUD

    func listTutorials() async throws -> [Tutorial] {
        try await client.get("/api/tutorials")
    }

    func getTutorial(id: String) async throws -> Tutorial {
        try await client.get("/api/tutorials/\(id)")
    }

    // MARK: - URLs for Media

    func videoURL(for tutorialId: String) -> URL {
        AppEnvironment.apiBaseURL.appendingPathComponent("/api/tutorials/\(tutorialId)/video")
    }

    func subtitleURL(for tutorialId: String) -> URL {
        AppEnvironment.apiBaseURL.appendingPathComponent("/api/tutorials/\(tutorialId)/subtitle")
    }

    func tablatureURL(for tutorialId: String) -> URL {
        AppEnvironment.apiBaseURL.appendingPathComponent("/api/tutorials/\(tutorialId)/tablature")
    }

    // MARK: - Metadata

    func getMetadata(for tutorialId: String) async throws -> TutorialMetadata {
        try await client.get("/api/tutorials/\(tutorialId)/metadata")
    }

    // MARK: - Tutorial Creation (Auth Required)

    func createTutorial(id: String, displayName: String? = nil) async throws -> [String: Any] {
        // Use a raw request since the response is a dynamic map
        var components = URLComponents(url: AppEnvironment.apiBaseURL.appendingPathComponent("/api/tutorials/create"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "tutorialId", value: id)]
        if let displayName = displayName {
            components.queryItems?.append(URLQueryItem(name: "displayName", value: displayName))
        }

        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.httpError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 500, body: data)
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        return json
    }
}
