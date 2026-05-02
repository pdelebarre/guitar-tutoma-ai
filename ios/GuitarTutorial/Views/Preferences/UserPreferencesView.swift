import SwiftUI

struct UserPreferencesView: View {
    @State private var viewModel = UserPreferencesViewModel()
    @State private var showAuth = false

    var body: some View {
        NavigationStack {
            Group {
                if !AuthService.shared.isAuthenticated {
                    VStack(spacing: 16) {
                        Image(systemName: "person.crop.circle.badge.exclamation")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)

                        Text("Sign in to manage preferences")
                            .font(.body)
                            .foregroundColor(.secondary)

                        Button("Sign In") {
                            showAuth = true
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.isLoading {
                    LoadingView("Loading preferences…")
                } else if let error = viewModel.error {
                    ErrorView(error) {
                        Task { await viewModel.loadPreferences() }
                    }
                } else if let prefs = viewModel.preferences {
                    Form {
                        Section("Display") {
                            HStack {
                                Text("Theme")
                                Spacer()
                                Text(prefs.theme.capitalized)
                                    .foregroundColor(.secondary)
                            }

                            HStack {
                                Text("Items Per Page")
                                Spacer()
                                Text("\(prefs.itemsPerPage)")
                                    .foregroundColor(.secondary)
                            }
                        }

                        Section("Defaults") {
                            HStack {
                                Text("Difficulty Filter")
                                Spacer()
                                Text(prefs.defaultDifficultyFilter)
                                    .foregroundColor(.secondary)
                            }

                            HStack {
                                Text("Sort Direction")
                                Spacer()
                                Text(prefs.defaultSortDirection == "asc" ? "Ascending" : "Descending")
                                    .foregroundColor(.secondary)
                            }
                        }

                        Section {
                            Button("Sign Out", role: .destructive) {
                                AuthService.shared.signOut()
                                viewModel.preferences = nil
                            }
                        }
                    }
                    .navigationTitle("Preferences")
                } else {
                    EmptyStateView(
                        icon: "gearshape",
                        title: "No Preferences",
                        message: "Preferences will appear here once loaded."
                    )
                }
            }
            .task {
                if AuthService.shared.isAuthenticated {
                    await viewModel.loadPreferences()
                }
            }
            .sheet(isPresented: $showAuth) {
                LoginView()
            }
        }
    }
}

#Preview {
    UserPreferencesView()
}
