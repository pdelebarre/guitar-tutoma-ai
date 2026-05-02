import Foundation
import Observation

@Observable
final class UserPreferencesViewModel {
    private let preferenceService = PreferenceService.shared

    var preferences: UserPreference?
    var isLoading = false
    var error: String?

    func loadPreferences() async {
        isLoading = true
        error = nil

        do {
            preferences = try await preferenceService.getUserPreferences()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
