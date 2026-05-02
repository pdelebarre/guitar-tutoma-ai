import Foundation

/// Service for playlist CRUD and tutorial ordering.
final class PlaylistService {
    static let shared = PlaylistService()

    private let client = APIClient.shared

    private init() {}

    func getAllPlaylists() async throws -> [Playlist] {
        try await client.get("/api/playlists")
    }

    func getPlaylist(id: Int) async throws -> Playlist {
        try await client.get("/api/playlists/\(id)")
    }

    func createPlaylist(name: String) async throws -> Playlist {
        let request = CreatePlaylistRequest(name: name)
        return try await client.post("/api/playlists", body: request)
    }

    func updatePlaylistName(id: Int, name: String) async throws -> Playlist {
        let request = CreatePlaylistRequest(name: name)
        return try await client.put("/api/playlists/\(id)", body: request)
    }

    func deletePlaylist(id: Int) async throws {
        try await client.delete("/api/playlists/\(id)")
    }

    func addTutorialToPlaylist(playlistId: Int, tutorialId: String) async throws -> Playlist {
        let request = AddTutorialRequest(tutorialId: tutorialId)
        return try await client.post("/api/playlists/\(playlistId)/tutorials", body: request)
    }

    func removeTutorialFromPlaylist(playlistId: Int, tutorialId: String) async throws {
        try await client.delete("/api/playlists/\(playlistId)/tutorials/\(tutorialId)")
    }

    func reorderTutorials(playlistId: Int, tutorialIds: [String]) async throws -> Playlist {
        let request = ReorderRequest(tutorialIds: tutorialIds)
        return try await client.put("/api/playlists/\(playlistId)/tutorials", body: request)
    }
}
