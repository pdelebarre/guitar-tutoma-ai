import Foundation

/// Per-tutorial preference.
struct Preference: Codable {
    let tutorialId: String
    let difficultyLevel: String
    let favorite: Bool
}

/// User-level preferences.
struct UserPreference: Codable {
    let userId: Int
    let theme: String
    let defaultDifficultyFilter: String
    let defaultSortDirection: String
    let itemsPerPage: Int
    let updatedAt: String?
}
