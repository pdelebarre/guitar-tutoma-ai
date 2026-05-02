import SwiftUI

struct DifficultyBadge: View {
    let level: String?

    private var color: Color {
        guard let level = level?.lowercased() else { return .gray }
        switch level {
        case "beginner":
            return .green
        case "intermediate":
            return .orange
        case "advanced":
            return .red
        default:
            return .gray
        }
    }

    private var displayText: String {
        level ?? "—"
    }

    var body: some View {
        Text(displayText)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}

#Preview {
    VStack(spacing: 8) {
        DifficultyBadge(level: "Beginner")
        DifficultyBadge(level: "Intermediate")
        DifficultyBadge(level: "Advanced")
        DifficultyBadge(level: nil)
    }
    .padding()
}
