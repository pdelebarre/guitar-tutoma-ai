import Foundation

struct LoginRequest: Codable {
    let username: String
    let password: String
}

struct RegisterRequest: Codable {
    let username: String
    let email: String
    let password: String
    let displayName: String?
}

struct AuthResponse: Codable {
    let userId: Int
    let username: String
    let displayName: String
    let token: String
}

struct UserDto: Codable {
    let id: Int
    let username: String
    let email: String
    let displayName: String
    let createdAt: String
}
