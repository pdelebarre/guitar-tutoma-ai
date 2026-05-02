import Foundation
import Security

/// Secure storage for sensitive data (auth tokens) using the iOS Keychain.
final class KeychainManager {
    static let shared = KeychainManager()

    private let service = "com.guitartutorial.app"

    private init() {}

    // MARK: - Token Management

    func saveToken(_ token: String) {
        guard let data = token.data(using: .utf8) else { return }

        // Delete any existing token first
        deleteToken()

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "auth_token",
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]

        SecItemAdd(query as CFDictionary, nil)
    }

    func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "auth_token",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "auth_token",
        ]

        SecItemDelete(query as CFDictionary)
    }

    var isAuthenticated: Bool {
        getToken() != nil
    }
}
