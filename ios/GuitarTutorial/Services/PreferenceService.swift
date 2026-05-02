import Foundation

/// Service for per-tutorial preferences and user-level preferences.
final class PreferenceService {
    static let shared = PreferenceService()

    private let client = APIClient.shared

    private init() {}

    // MARK: - Per-Tutorial Preferences

    func getPreferences(for tutorialId: String) async throws -> Preference {
        try await client.get("/api/tutorials/\(tutorialId)/preferences")
    }

    func updatePreferences(for tutorialId: String, preference: Preference) async throws -> Preference {
        try await client.put("/api/tutorials/\(tutorialId)/preferences", body: preference)
    }

    // MARK: - User-Level Preferences (Auth Required)

    func getUserPreferences() async throws -> UserPreference {
        try await client.get("/api/user/preferences")
    }

    func updateUserPreferences(_ preferences: [String: Any]) async throws -> UserPreference {
        // Use raw request for dynamic body
        let data = try JSONSerialization.data(withJSONObject: preferences)
        var request = try URLRequest(url: AppEnvironment.apiBaseURL.appendingPathComponent("/api/user/preferences"))
        request.httpMethod = "PUT"
        request.httpBody = data
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (responseData, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.httpError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 500, body: responseData)
        }

        return try JSONDecoder().decode(UserPreference.self, from: responseData)
    }
}
