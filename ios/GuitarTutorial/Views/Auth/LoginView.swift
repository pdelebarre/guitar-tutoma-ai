import SwiftUI

struct LoginView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = AuthViewModel()

    @State private var username = ""
    @State private var password = ""
    @State private var showRegister = false

    var onAuthenticated: (() -> Void)?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Username", text: $username)
                        .textContentType(.username)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)

                    SecureField("Password", text: $password)
                        .textContentType(.password)
                }

                if let error = viewModel.error {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button(action: {
                        Task {
                            await viewModel.login(username: username, password: password)
                            if viewModel.isAuthenticated {
                                onAuthenticated?()
                                dismiss()
                            }
                        }
                    }) {
                        if viewModel.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Sign In")
                                .frame(maxWidth: .infinity)
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(username.isEmpty || password.isEmpty || viewModel.isLoading)
                }
            }
            .navigationTitle("Sign In")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .bottomBar) {
                    Button("Don't have an account? Register") {
                        showRegister = true
                    }
                    .font(.caption)
                }
            }
            .sheet(isPresented: $showRegister) {
                RegisterView(onAuthenticated: onAuthenticated)
            }
        }
    }
}

#Preview {
    LoginView()
}
