import Foundation

struct Playlist: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let createdAt: String
    let tutorials: [PlaylistTutorial]
}

struct PlaylistTutorial: Codable, Hashable {
    let tutorialId: String
    let tutorialName: String
    let ordinalPosition: Int
}

struct CreatePlaylistRequest: Codable {
    let name: String
}

struct AddTutorialRequest: Codable {
    let tutorialId: String
}

struct ReorderRequest: Codable {
    let tutorialIds: [String]
}
