import Foundation
import Observation

@Observable
final class SearchViewModel {
    private let searchService = SearchService.shared

    var query = ""
    var results: [SearchResult] = []
    var isLoading = false
    var error: String?

    func search() async {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            results = []
            return
        }

        isLoading = true
        error = nil

        do {
            let response = try await searchService.search(query: trimmed)
            results = response.results
        } catch {
            self.error = error.localizedDescription
            results = []
        }

        isLoading = false
    }

    func clear() {
        query = ""
        results = []
        error = nil
    }
}
