import Foundation
import Observation

@Observable
final class SongLibraryViewModel {
    private let tutorialService = TutorialService.shared
    private let searchService = SearchService.shared

    var tutorials: [Tutorial] = []
    var isLoading = false
    var error: String?

    // Search
    var searchQuery = ""
    var semanticResults: [SearchResult]?
    var isSearching = false
    var searchError: String?

    // Filtering
    var difficultyFilter: DifficultyFilter = .all
    var sortDirection: SortDirection = .asc

    enum DifficultyFilter: String, CaseIterable {
        case all = "All"
        case beginner = "Beginner"
        case intermediate = "Intermediate"
        case advanced = "Advanced"
    }

    enum SortDirection {
        case asc, desc
    }

    var filteredTutorials: [Tutorial] {
        var result = tutorials

        // Local text filter
        if !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
            let query = searchQuery.trimmingCharacters(in: .whitespaces).lowercased()
            result = result.filter { $0.name.lowercased().contains(query) }
        }

        // Difficulty filter
        if difficultyFilter != .all {
            result = result.filter { _ in
                // Difficulty is stored in preferences, not on Tutorial model
                // For MVP, we skip server-side difficulty filtering
                true
            }
        }

        // Sort
        result.sort { a, b in
            sortDirection == .asc
                ? a.name.localizedCompare(b.name) == .orderedAscending
                : a.name.localizedCompare(b.name) == .orderedDescending
        }

        return result
    }

    var isShowingSemanticResults: Bool {
        guard !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty else { return false }
        return semanticResults != nil && !semanticResults!.isEmpty
    }

    func loadTutorials() async {
        isLoading = true
        error = nil

        do {
            tutorials = try await tutorialService.listTutorials()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func performSemanticSearch() async {
        let query = searchQuery.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else {
            semanticResults = nil
            searchError = nil
            return
        }

        isSearching = true
        searchError = nil

        do {
            let response = try await searchService.search(query: query)
            semanticResults = response.results
        } catch {
            searchError = error.localizedDescription
            semanticResults = nil
        }

        isSearching = false
    }

    func toggleSortDirection() {
        sortDirection = sortDirection == .asc ? .desc : .asc
    }
}
