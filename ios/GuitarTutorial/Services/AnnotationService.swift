import Foundation

/// Service for PDF annotation CRUD.
final class AnnotationService {
    static let shared = AnnotationService()

    private let client = APIClient.shared

    private init() {}

    func getAnnotations(for tutorialId: String) async throws -> [Annotation] {
        try await client.get("/api/tutorials/\(tutorialId)/annotations")
    }

    func createAnnotation(for tutorialId: String, request: CreateAnnotationRequest) async throws -> Annotation {
        try await client.post("/api/tutorials/\(tutorialId)/annotations", body: request)
    }

    func updateAnnotation(tutorialId: String, annotationId: Int, request: CreateAnnotationRequest) async throws -> Annotation {
        try await client.put("/api/tutorials/\(tutorialId)/annotations/\(annotationId)", body: request)
    }

    func deleteAnnotation(tutorialId: String, annotationId: Int) async throws {
        try await client.delete("/api/tutorials/\(tutorialId)/annotations/\(annotationId)")
    }
}
