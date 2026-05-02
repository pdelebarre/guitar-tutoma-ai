import Foundation
import Observation

@Observable
final class AuthViewModel {
    private let authService = AuthService.shared

    var isAuthenticated = false
    var currentUser: UserDto?
    var isLoading = false
    var error: String?

    init() {
        self.isAuthenticated = authService.isAuthenticated
    }

    func login(username: String, password: String) async {
        isLoading = true
        error = nil

        do {
            let response = try await authService.login(username: username, password: password)
            isAuthenticated = true
            currentUser = UserDto(
                id: response.userId,
                username: response.username,
                email: "",
                displayName: response.displayName,
                createdAt: ""
            )
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func register(username: String, email: String, password: String, displayName: String?) async {
        isLoading = true
        error = nil

        do {
            let response = try await authService.register(
                username: username,
                email: email,
                password: password,
                displayName: displayName
            )
            isAuthenticated = true
            currentUser = UserDto(
                id: response.userId,
                username: response.username,
                email: email,
                displayName: response.displayName,
                createdAt: ""
            )
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func signOut() {
        authService.signOut()
        isAuthenticated = false
        currentUser = nil
    }

    func checkAuth() {
        isAuthenticated = authService.isAuthenticated
    }
}
