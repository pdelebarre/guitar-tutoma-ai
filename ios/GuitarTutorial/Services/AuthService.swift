import Foundation

/// Handles authentication: login, register, token management.
final class AuthService {
    static let shared = AuthService()

    private let client = APIClient.shared

    private init() {}

    // MARK: - Authentication

    func login(username: String, password: String) async throws -> AuthResponse {
        let request = LoginRequest(username: username, password: password)
        let response: AuthResponse = try await client.post("/api/auth/login", body: request)

        // Store token securely
        KeychainManager.shared.saveToken(response.token)

        return response
    }

    func register(username: String, email: String, password: String, displayName: String? = nil) async throws -> AuthResponse {
        let request = RegisterRequest(
            username: username,
            email: email,
            password: password,
            displayName: displayName
        )
        let response: AuthResponse = try await client.post("/api/auth/register", body: request)

        // Store token securely
        KeychainManager.shared.saveToken(response.token)

        return response
    }

    func getCurrentUser() async throws -> UserDto {
        try await client.get("/api/auth/me")
    }

    func signOut() {
        KeychainManager.shared.deleteToken()
    }

    var isAuthenticated: Bool {
        KeychainManager.shared.isAuthenticated
    }
}
