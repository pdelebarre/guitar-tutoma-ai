import SwiftUI

struct PlaylistListView: View {
    @State private var viewModel = PlaylistViewModel()
    @State private var showCreate = false
    @State private var newPlaylistName = ""

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    LoadingView("Loading playlists…")
                } else if let error = viewModel.error {
                    ErrorView(error) {
                        Task { await viewModel.loadPlaylists() }
                    }
                } else if viewModel.playlists.isEmpty {
                    EmptyStateView(
                        icon: "music.note.list",
                        title: "No Playlists",
                        message: "Create a playlist to organize your tutorials."
                    )
                } else {
                    List {
                        ForEach(viewModel.playlists) { playlist in
                            NavigationLink(destination: PlaylistDetailView(playlist: playlist)) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(playlist.name)
                                        .font(.body)
                                        .fontWeight(.medium)
                                    Text("\(playlist.tutorials.count) tutorials")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                        .onDelete(perform: deletePlaylists)
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Playlists")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showCreate = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .alert("New Playlist", isPresented: $showCreate) {
                TextField("Playlist Name", text: $newPlaylistName)
                Button("Cancel", role: .cancel) {
                    newPlaylistName = ""
                }
                Button("Create") {
                    Task {
                        await viewModel.createPlaylist(name: newPlaylistName)
                        newPlaylistName = ""
                    }
                }
                .disabled(newPlaylistName.trimmingCharacters(in: .whitespaces).isEmpty)
            } message: {
                Text("Enter a name for your new playlist.")
            }
            .task {
                await viewModel.loadPlaylists()
            }
        }
    }

    private func deletePlaylists(at offsets: IndexSet) {
        Task {
            for index in offsets {
                let playlist = viewModel.playlists[index]
                await viewModel.deletePlaylist(id: playlist.id)
            }
        }
    }
}

// MARK: - Playlist Detail (Placeholder)

struct PlaylistDetailView: View {
    let playlist: Playlist

    var body: some View {
        Group {
            if playlist.tutorials.isEmpty {
                EmptyStateView(
                    icon: "tray",
                    title: "Empty Playlist",
                    message: "Add tutorials from the Library."
                )
            } else {
                List(playlist.tutorials, id: \.tutorialId) { tutorial in
                    NavigationLink(destination: TutorialDetailView(tutorialId: tutorial.tutorialId)) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(tutorial.tutorialName)
                                .font(.body)
                            Text("Position \(tutorial.ordinalPosition)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .navigationTitle(playlist.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    PlaylistListView()
}
