import SwiftUI

struct TutorialDetailView: View {
    let tutorialId: String

    @State private var viewModel = TutorialDetailViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView("Loading tutorial…")
            } else if let error = viewModel.error {
                ErrorView(error) {
                    Task { await viewModel.loadTutorial(id: tutorialId) }
                }
            } else if let tutorial = viewModel.tutorial {
                tutorialContent(tutorial)
            } else {
                ErrorView("Tutorial not found.")
            }
        }
        .navigationTitle(viewModel.tutorial?.name ?? "Tutorial")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadTutorial(id: tutorialId)
        }
    }

    @ViewBuilder
    private func tutorialContent(_ tutorial: Tutorial) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Video Section
                section("Video") {
                    VideoPlayerView(
                        tutorialId: tutorial.id,
                        hasSubtitle: tutorial.hasSubtitle
                    )

                    if tutorial.hasSubtitle {
                        Label("Subtitles available", systemImage: "captions.bubble.fill")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                // Tablature Section
                if tutorial.hasTablature {
                    section("Tablature") {
                        NavigationLink(destination: TablatureDetailView(tutorialId: tutorial.id)) {
                            HStack {
                                Image(systemName: "doc.text.fill")
                                    .font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("View Tablature PDF")
                                        .font(.body)
                                    Text("Tap to open the PDF viewer")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                            .background(Color.secondary.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                    }
                }

                // Metadata Section
                section("Details") {
                    MetadataSummaryView(tutorialId: tutorial.id)
                }

                // Comments Section
                section("Comments") {
                    CommentSectionView(tutorialId: tutorial.id)
                }
            }
            .padding()
        }
    }

    // MARK: - Section Helper

    @ViewBuilder
    private func section(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
                .fontWeight(.semibold)

            content()
        }
    }
}

// MARK: - Metadata Summary

struct MetadataSummaryView: View {
    let tutorialId: String
    @State private var metadata: TutorialMetadata?
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                HStack {
                    ProgressView()
                    Text("Loading metadata…")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            } else if let metadata = metadata {
                VStack(alignment: .leading, spacing: 8) {
                    if let title = metadata.title {
                        metadataRow("Title", title)
                    }
                    if let tuning = metadata.tuning {
                        metadataRow("Tuning", tuning)
                    }
                    if let key = metadata.musicalKey {
                        metadataRow("Key", key)
                    }
                    if let difficulty = metadata.difficulty {
                        HStack {
                            Text("Difficulty")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            DifficultyBadge(level: difficulty)
                        }
                    }
                    if let techniques = metadata.techniques {
                        metadataRow("Techniques", techniques)
                    }
                    if let genre = metadata.genre {
                        metadataRow("Genre", genre)
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                Text("No metadata available. Upload a PDF to extract metadata.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .task {
            await loadMetadata()
        }
    }

    private func loadMetadata() async {
        isLoading = true
        do {
            metadata = try await TutorialService.shared.getMetadata(for: tutorialId)
        } catch {
            metadata = nil
        }
        isLoading = false
    }

    private func metadataRow(_ label: String, _ value: String) -> some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(width: 72, alignment: .leading)
            Text(value)
                .font(.body)
            Spacer()
        }
    }
}

// MARK: - Placeholder Views (Phase 2)

struct TablatureDetailView: View {
    let tutorialId: String

    var body: some View {
        // Placeholder — PDFKit integration will be added in Phase 2
        WebView(url: TutorialService.shared.tablatureURL(for: tutorialId))
            .navigationTitle("Tablature")
            .navigationBarTitleDisplayMode(.inline)
    }
}

struct CommentSectionView: View {
    let tutorialId: String

    var body: some View {
        // Placeholder — comment CRUD will be added in Phase 2
        Text("Comments will be available in a future update.")
            .font(.caption)
            .foregroundColor(.secondary)
            .padding()
            .frame(maxWidth: .infinity, alignment: .center)
    }
}

// MARK: - Simple WebView for PDF (placeholder)

import WebKit

struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

#Preview {
    NavigationStack {
        TutorialDetailView(tutorialId: "1")
    }
}
