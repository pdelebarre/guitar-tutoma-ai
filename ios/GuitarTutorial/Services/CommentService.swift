import Foundation

/// Service for tutorial comments CRUD.
final class CommentService {
    static let shared = CommentService()

    private let client = APIClient.shared

    private init() {}

    func getComments(for tutorialId: String) async throws -> [Comment] {
        try await client.get("/api/tutorials/\(tutorialId)/comments")
    }

    func createComment(for tutorialId: String, text: String) async throws -> Comment {
        let request = CreateCommentRequest(text: text)
        return try await client.post("/api/tutorials/\(tutorialId)/comments", body: request)
    }

    func updateComment(tutorialId: String, commentId: Int, text: String) async throws -> Comment {
        let request = CreateCommentRequest(text: text)
        return try await client.put("/api/tutorials/\(tutorialId)/comments/\(commentId)", body: request)
    }

    func deleteComment(tutorialId: String, commentId: Int) async throws {
        try await client.delete("/api/tutorials/\(tutorialId)/comments/\(commentId)")
    }
}
