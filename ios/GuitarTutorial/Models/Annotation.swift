import Foundation

struct Annotation: Codable, Identifiable, Hashable {
    let id: Int
    let tutorialId: String
    let pageNumber: Int
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    let content: String
    let type: AnnotationType
    let strokeData: String?
    let color: String?
    let createdAt: String
}

enum AnnotationType: String, Codable {
    case text
    case underline
    case highlight
    case drawing
}

struct CreateAnnotationRequest: Codable {
    let pageNumber: Int
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    let content: String
    let type: AnnotationType
    let strokeData: String?
    let color: String?
}

struct StrokePoint: Codable {
    let x: Double
    let y: Double
}
