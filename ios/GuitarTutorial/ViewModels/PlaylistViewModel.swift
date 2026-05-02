import Foundation
import Observation

@Observable
final class PlaylistViewModel {
    private let playlistService = PlaylistService.shared

    var playlists: [Playlist] = []
    var isLoading = false
    var error: String?

    func loadPlaylists() async {
        isLoading = true
        error = nil

        do {
            playlists = try await playlistService.getAllPlaylists()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func createPlaylist(name: String) async {
        do {
            let playlist = try await playlistService.createPlaylist(name: name)
            playlists.append(playlist)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deletePlaylist(id: Int) async {
        do {
            try await playlistService.deletePlaylist(id: id)
            playlists.removeAll { $0.id == id }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
