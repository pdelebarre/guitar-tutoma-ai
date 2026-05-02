import SwiftUI

/// A simple skeleton loading placeholder for tutorial rows.
struct SkeletonLoadingView: View {
    var body: some View {
        VStack(spacing: 0) {
            ForEach(0..<6) { _ in
                HStack(spacing: 12) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(.quaternary)
                        .frame(height: 16)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(.quaternary)
                        .frame(width: 24, height: 16)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(.quaternary)
                        .frame(width: 24, height: 16)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(.quaternary)
                        .frame(width: 60, height: 16)
                }
                .padding(.horizontal)
                .padding(.vertical, 12)
                Divider()
            }
        }
        .shimmering()
    }
}

// MARK: - Shimmer Modifier

struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        gradient: Gradient(colors: [
                            .clear,
                            .white.opacity(0.3),
                            .clear,
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 0.5)
                    .offset(x: geometry.size.width * phase)
                    .blur(radius: 8)
                }
            )
            .clipped()
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

extension View {
    func shimmering() -> some View {
        modifier(ShimmerModifier())
    }
}

#Preview {
    SkeletonLoadingView()
}
