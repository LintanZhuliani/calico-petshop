export const API_URL = import.meta.env.PROD 
  ? "/api" 
  : "http://localhost:3001/api";

/**
 * Fetch wrapper that automatically includes credentials (cookies)
 * so that Better Auth sessions work seamlessly.
 */
export async function apiFetch(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // This is crucial for session cookies
    cache: "no-store", // Mencegah caching oleh browser (fix stale data)
  };

  if (options.body && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    // Global 401 Unauthorized Handling
    if (response.status === 401) {
      // Hanya redirect jika kita belum berada di halaman login
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // Hapus cache yang sensitif
        localStorage.removeItem('calico_products_cache');
        window.location.href = "/login?expired=true";
      }
    }

    let errorMessage = `API Error: ${response.statusText}`;
    try {
      const errData = await response.json();
      errorMessage = errData.error || errorMessage;
    } catch (e) {
      // Not JSON
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (like 204 No Content)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  
  // For file downloads (CSV), return blob
  if (contentType && contentType.includes("text/csv")) {
    return response.blob();
  }

  return response.text();
}
