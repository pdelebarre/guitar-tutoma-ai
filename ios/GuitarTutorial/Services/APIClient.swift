import Foundation

// MARK: - API Errors

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int, body: Data?)
    case decodingError(Error)
    case networkError(Error)
    case unauthorized
    case notFound
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode, _):
            return "HTTP error \(statusCode)"
        case .decodingError(let error):
            return "Failed to process data: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .unauthorized:
            return "Please sign in to continue"
        case .notFound:
            return "Resource not found"
        case .serverError(let message):
            return "Server error: \(message)"
        }
    }
}

// MARK: - APIClient

/// Centralized HTTP client for all backend API calls.
/// Uses async/await and handles auth token injection automatically.
final class APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = AppEnvironment.requestTimeout
        config.timeoutIntervalForResource = AppEnvironment.requestTimeout * 2
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    // MARK: - Request Methods

    /// Perform a GET request.
    func get<T: Decodable>(_ path: String) async throws -> T {
        let request = try buildRequest(path: path, method: "GET")
        return try await perform(request)
    }

    /// Perform a POST request with an encodable body.
    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        var request = try buildRequest(path: path, method: "POST")
        request.httpBody = try encoder.encode(body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await perform(request)
    }

    /// Perform a POST request with no body, returning a decodable response.
    func post<T: Decodable>(_ path: String) async throws -> T {
        let request = try buildRequest(path: path, method: "POST")
        return try await perform(request)
    }

    /// Perform a PUT request with an encodable body.
    func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        var request = try buildRequest(path: path, method: "PUT")
        request.httpBody = try encoder.encode(body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await perform(request)
    }

    /// Perform a DELETE request.
    func delete(_ path: String) async throws {
        let request = try buildRequest(path: path, method: "DELETE")
        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }
        if httpResponse.statusCode == 404 {
            throw APIError.notFound
        }
        if httpResponse.statusCode >= 500 {
            throw APIError.serverError("Internal server error")
        }
    }

    /// Perform a multipart upload (for file uploads).
    func upload<T: Decodable>(
        _ path: String,
        multipartFormData: [String: MultipartFile],
        fieldName: String = "file"
    ) async throws -> T {
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = try buildRequest(path: path, method: "POST")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        for (key, file) in multipartFormData {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(key)\"; filename=\"\(file.filename)\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: \(file.mimeType)\r\n\r\n".data(using: .utf8)!)
            body.append(file.data)
            body.append("\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        return try await perform(request)
    }

    // MARK: - Private Helpers

    private func buildRequest(path: String, method: String) throws -> URLRequest {
        guard let url = URL(string: path, relativeTo: AppEnvironment.apiBaseURL) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method

        // Inject auth token if available
        if let token = KeychainManager.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response): (Data, URLResponse)

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Handle 204 No Content
        if httpResponse.statusCode == 204 {
            guard let empty = Data("{}".utf8) as? T else {
                throw APIError.invalidResponse
            }
            return empty
        }

        switch httpResponse.statusCode {
        case 200...299:
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        case 401:
            // Clear invalid token
            KeychainManager.shared.deleteToken()
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        case 400...499:
            let body = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw APIError.httpError(statusCode: httpResponse.statusCode, body: data)
        case 500...599:
            throw APIError.serverError(String(data: data, encoding: .utf8) ?? "Internal server error")
        default:
            throw APIError.httpError(statusCode: httpResponse.statusCode, body: data)
        }
    }
}

// MARK: - Multipart File Helper

struct MultipartFile {
    let data: Data
    let filename: String
    let mimeType: String
}
