import Foundation

enum AppEnvironment {
    /// The base URL for the backend API.
    /// Change this to your production URL when deploying.
    static let apiBaseURL: URL = {
        #if DEBUG
        // For local development — adjust if your backend runs on a different port
        return URL(string: "http://localhost:8080")!
        #else
        // Production URL — update this before App Store submission
        return URL(string: "https://api.guitartutorial.app")!
        #endif
    }()

    /// Request timeout interval in seconds
    static let requestTimeout: TimeInterval = 30

    /// Maximum number of search results
    static let maxSearchResults: Int = 10
}
