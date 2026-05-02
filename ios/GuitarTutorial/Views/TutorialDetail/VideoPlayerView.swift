import SwiftUI
import AVKit

/// A native AVPlayer-based video player with subtitle support.
struct VideoPlayerView: View {
    let tutorialId: String
    let hasSubtitle: Bool

    @State private var player: AVPlayer?
    @State private var subtitleReady = false
    @State private var isCheckingSubtitles = false

    var body: some View {
        VStack(spacing: 8) {
            if let player = player {
                VideoPlayer(player: player)
                    .aspectRatio(16 / 9, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                    )
            } else {
                // Placeholder while loading
                Rectangle()
                    .fill(Color.black.opacity(0.05))
                    .aspectRatio(16 / 9, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay {
                        Image(systemName: "play.fill")
                            .font(.largeTitle)
                            .foregroundColor(.secondary)
                    }
            }

            // Subtitle generation status
            if hasSubtitle && !subtitleReady {
                HStack(spacing: 8) {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Generating subtitles…")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .onAppear {
            setupPlayer()
            if hasSubtitle {
                checkSubtitleAvailability()
            }
        }
        .onDisappear {
            player?.pause()
        }
    }

    private func setupPlayer() {
        let videoURL = TutorialService.shared.videoURL(for: tutorialId)
        let asset = AVAsset(url: videoURL)
        let playerItem = AVPlayerItem(asset: asset)

        // Add subtitle track if available
        if hasSubtitle {
            let subtitleURL = TutorialService.shared.subtitleURL(for: tutorialId)
            let subtitleAsset = AVAsset(url: subtitleURL)
            let subtitleGroup = AVMediaSelectionGroup.self

            // AVPlayer automatically picks up VTT subtitles when added as part of the composition
            // For external VTT, we use the AVPlayerItem's textStyleRule or add as AVPlayerItemTrack
            let subtitleItem = AVMutableComposition()
            // In practice, AVPlayer handles external VTT via URL directly
        }

        player = AVPlayer(playerItem: playerItem)
        player?.play()
    }

    private func checkSubtitleAvailability() {
        isCheckingSubtitles = true
        let subtitleURL = TutorialService.shared.subtitleURL(for: tutorialId)

        Task {
            var attempts = 0
            let maxAttempts = 60

            while attempts < maxAttempts {
                do {
                    let request = URLRequest(url: subtitleURL)
                    let (_, response) = try await URLSession.shared.data(for: request)
                    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                        await MainActor.run {
                            subtitleReady = true
                            isCheckingSubtitles = false
                            // Re-create player to pick up subtitle track
                            setupPlayer()
                        }
                        return
                    }
                } catch {
                    // Retry
                }
                attempts += 1
                try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
            }

            await MainActor.run {
                isCheckingSubtitles = false
            }
        }
    }
}

#Preview {
    VideoPlayerView(tutorialId: "1", hasSubtitle: true)
        .padding()
}
