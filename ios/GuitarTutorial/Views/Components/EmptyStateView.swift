import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String?

    init(icon: String = "music.note.list", title: String, message: String? = nil) {
        self.icon = icon
        self.title = title
        self.message = message
    }

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(.secondary.opacity(0.6))

            Text(title)
                .font(.title3)
                .fontWeight(.medium)
                .foregroundColor(.primary)

            if let message = message {
                Text(message)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

#Preview {
    EmptyStateView(
        icon: "magnifyingglass",
        title: "No Results",
        message: "Try adjusting your search or filter."
    )
}
