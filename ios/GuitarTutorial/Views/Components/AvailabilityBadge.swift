import SwiftUI

struct AvailabilityBadge: View {
    let available: Bool
    let label: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: available ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.caption)
                .foregroundColor(available ? .green : .secondary.opacity(0.5))

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    VStack(spacing: 8) {
        AvailabilityBadge(available: true, label: "Subtitles")
        AvailabilityBadge(available: false, label: "Tablature")
    }
    .padding()
}
