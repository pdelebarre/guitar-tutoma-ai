import Foundation

/// Matches the backend `TutorialInfo` DTO.
struct Tutorial: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let videoFilename: String
    let hasSubtitle: Bool
    let hasTablature: Bool

    enum CodingKeys: String, CodingKey {
        case id, name, videoFilename, hasSubtitle, hasTablature
    }
}
