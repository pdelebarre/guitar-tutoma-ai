import Foundation
import Observation

@Observable
final class TutorialDetailViewModel {
    private let tutorialService = TutorialService.shared

    var tutorial: Tutorial?
    var isLoading = false
    var error: String?

    func loadTutorial(id: String) async {
        isLoading = true
        error = nil

        do {
            tutorial = try await tutorialService.getTutorial(id: id)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
