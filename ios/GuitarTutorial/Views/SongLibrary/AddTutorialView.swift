import SwiftUI

struct AddTutorialView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var tutorialId = ""
    @State private var displayName = ""
    @State private var isLoading = false
    @State private var error: String?

    let onSuccess: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Tutorial Details") {
                    TextField("Tutorial ID (e.g. 'wonderwall')", text: $tutorialId)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)

                    TextField("Display Name (optional)", text: $displayName)
                }

                if let error = error {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button(action: createTutorial) {
                        if isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Create Tutorial")
                                .frame(maxWidth: .infinity)
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(tutorialId.isEmpty || isLoading)
                }
            }
            .navigationTitle("Add Tutorial")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func createTutorial() {
        Task {
            isLoading = true
            error = nil

            do {
                _ = try await TutorialService.shared.createTutorial(
                    id: tutorialId.trimmingCharacters(in: .whitespaces),
                    displayName: displayName.trimmingCharacters(in: .whitespaces).isEmpty
                        ? nil
                        : displayName.trimmingCharacters(in: .whitespaces)
                )
                onSuccess()
                dismiss()
            } catch {
                self.error = error.localizedDescription
            }

            isLoading = false
        }
    }
}

#Preview {
    AddTutorialView(onSuccess: {})
}
