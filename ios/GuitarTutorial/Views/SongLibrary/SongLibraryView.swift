import SwiftUI

struct SongLibraryView: View {
    @State private var viewModel = SongLibraryViewModel()
    @State private var showAuth = false
    @State private var showAddTutorial = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    SkeletonLoadingView()
                } else if let error = viewModel.error {
                    ErrorView(error) {
                        Task { await viewModel.loadTutorials() }
                    }
                } else if viewModel.tutorials.isEmpty {
                    EmptyStateView(
                        icon: "music.note.list",
                        title: "No Tutorials",
                        message: "Tutorials will appear here once added."
                    )
                } else {
                    tutorialList
                }
            }
            .navigationTitle("Library")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    if AuthService.shared.isAuthenticated {
                        Button(action: { showAddTutorial = true }) {
                            Image(systemName: "plus")
                        }
                    } else {
                        Button(action: { showAuth = true }) {
                            Image(systemName: "person.circle")
                        }
                    }
                }
            }
            .searchable(text: $viewModel.searchQuery, prompt: "Search tutorials…")
            .onSubmit(of: .search) {
                Task { await viewModel.performSemanticSearch() }
            }
            .onChange(of: viewModel.searchQuery) { _, newValue in
                if newValue.trimmingCharacters(in: .whitespaces).isEmpty {
                    viewModel.semanticResults = nil
                }
            }
            .task {
                await viewModel.loadTutorials()
            }
            .sheet(isPresented: $showAuth) {
                LoginView()
            }
            .sheet(isPresented: $showAddTutorial) {
                AddTutorialView(onSuccess: {
                    Task { await viewModel.loadTutorials() }
                })
            }
        }
    }

    // MARK: - Tutorial List

    private var tutorialList: some View {
        let displayItems = viewModel.isShowingSemanticResults
            ? viewModel.semanticResults!.map { TutorialResult.semantic($0) }
            : viewModel.filteredTutorials.map { TutorialResult.tutorial($0) }

        return List {
            if viewModel.isShowingSemanticResults {
                Section {
                    Label("AI Search Results", systemImage: "sparkle.magnifyingglass")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                ForEach(viewModel.semanticResults ?? []) { result in
                    NavigationLink(destination: TutorialDetailView(tutorialId: result.tutorialId)) {
                        SemanticSearchRow(result: result)
                    }
                }
            } else {
                ForEach(viewModel.filteredTutorials) { tutorial in
                    NavigationLink(destination: TutorialDetailView(tutorialId: tutorial.id)) {
                        TutorialRowView(tutorial: tutorial)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

// MARK: - Tutorial Row

struct TutorialRowView: View {
    let tutorial: Tutorial

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(tutorial.name)
                    .font(.body)
                    .fontWeight(.medium)

                HStack(spacing: 12) {
                    AvailabilityBadge(available: tutorial.hasSubtitle, label: "Subtitles")
                    AvailabilityBadge(available: tutorial.hasTablature, label: "Tablature")
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Semantic Search Row

struct SemanticSearchRow: View {
    let result: SearchResult

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(result.title ?? result.name)
                    .font(.body)
                    .fontWeight(.medium)

                if let title = result.title, title != result.name {
                    Text(result.name)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                HStack(spacing: 12) {
                    AvailabilityBadge(available: result.hasSubtitle, label: "Subtitles")
                    AvailabilityBadge(available: result.hasTablature, label: "Tablature")

                    if let difficulty = result.difficulty {
                        DifficultyBadge(level: difficulty)
                    }
                }
            }

            Spacer()

            // Relevance score
            VStack(spacing: 2) {
                Text("\(Int(result.relevanceScore * 100))%")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.accentColor)
                Text("match")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Helper

private enum TutorialResult {
    case tutorial(Tutorial)
    case semantic(SearchResult)
}

#Preview {
    SongLibraryView()
}
