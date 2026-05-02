import SwiftUI

/// Root content view that adapts to the device idiom.
/// - iPhone: Tab bar with navigation stacks
/// - iPad: NavigationSplitView with sidebar
struct ContentView: View {
    @State private var authViewModel = AuthViewModel()

    var body: some View {
        if UIDevice.current.userInterfaceIdiom == .pad {
            iPadLayout
        } else {
            iPhoneLayout
        }
    }

    // MARK: - iPhone Layout (Tab Bar)

    private var iPhoneLayout: some View {
        TabView {
            SongLibraryView()
                .tabItem {
                    Label("Library", systemImage: "music.note.list")
                }

            SearchResultsView()
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }

            PlaylistListView()
                .tabItem {
                    Label("Playlists", systemImage: "list.star")
                }

            UserPreferencesView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
        .environment(authViewModel)
    }

    // MARK: - iPad Layout (Split View)

    private var iPadLayout: some View {
        NavigationSplitView {
            // Sidebar
            List {
                NavigationLink(destination: SongLibraryView()) {
                    Label("Library", systemImage: "music.note.list")
                }

                NavigationLink(destination: SearchResultsView()) {
                    Label("Search", systemImage: "magnifyingglass")
                }

                NavigationLink(destination: PlaylistListView()) {
                    Label("Playlists", systemImage: "list.star")
                }

                NavigationLink(destination: UserPreferencesView()) {
                    Label("Settings", systemImage: "gearshape")
                }
            }
            .listStyle(.sidebar)
            .navigationTitle("Guitar Tutor")
        } detail: {
            // Default detail view
            SongLibraryView()
        }
        .environment(authViewModel)
    }
}

#Preview {
    ContentView()
}
