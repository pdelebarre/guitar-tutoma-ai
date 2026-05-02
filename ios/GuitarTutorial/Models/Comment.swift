import Foundation

struct Comment: Codable, Identifiable, Hashable {
    let id: Int
    let tutorialId: String
    let text: String
    let createdAt: String
    let updatedAt: String?
}

struct CreateCommentRequest: Codable {
    let text: String
}
