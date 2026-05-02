import SwiftUI

struct SearchResultsView: View {
    @State private var viewModel = SearchViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Search tutorials…", text: $viewModel.query)
                        .textFieldStyle(.plain)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .onSubmit {
                            Task { await viewModel.search() }
                        }

                    if !viewModel.query.isEmpty {
                        Button(action: { viewModel.clear() }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding()

                // Results
                Group {
                    if viewModel.isLoading {
                        LoadingView("Searching…")
                    } else if let error = viewModel.error {
                        ErrorView(error) {
                            Task { await viewModel.search() }
                        }
                    } else if viewModel.results.isEmpty && !viewModel.query.isEmpty {
                        EmptyStateView(
                            icon: "magnifyingglass",
                            title: "No Results",
                            message: "Try a different search term."
                        )
                    } else if viewModel.results.isEmpty {
                        EmptyStateView(
                            icon: "sparkle.magnifyingglass",
                            title: "AI-Powered Search",
                            message: "Search across all tutorial content using semantic search."
                        )
                    } else {
                        List(viewModel.results) { result in
                            NavigationLink(destination: TutorialDetailView(tutorialId: result.tutorialId)) {
                                SemanticSearchRow(result: result)
                            }
                        }
                        .listStyle(.insetGrouped)
                    }
                }
            }
            .navigationTitle("Search")
        }
    }
}

#Preview {
    SearchResultsView()
}
