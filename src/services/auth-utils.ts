import axios, { AxiosError, InternalAxiosRequestConfig, AxiosInstance } from "axios";

export interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

/**
 * Shared refresh logic that deduplicates concurrent refresh attempts.
 * Centralizes localStorage key access ("cw_access_token"/"cw_refresh_token").
 */
export async function refreshAccessToken(): Promise<string> {
  const refresh = localStorage.getItem("cw_refresh_token");
  if (!refresh) {
    return Promise.reject(new Error("No refresh token available"));
  }

  if (!refreshPromise) {
    const baseApi = import.meta.env.VITE_JDS_API_BASE_URL || "https://portal.jawafdehi.org/api";
    refreshPromise = axios
      .post(`${baseApi}/caseworker/auth/token/refresh/`, { refresh })
      .then(({ data }) => {
        localStorage.setItem("cw_access_token", data.access);
        return data.access as string;
      })
      .catch((error) => {
        localStorage.removeItem("cw_access_token");
        localStorage.removeItem("cw_refresh_token");
        window.location.href = "/caseworker/login";
        return Promise.reject(error);
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

/**
 * Reusable interceptor rejection handler to attach to any caseworker client.
 */
export async function handleInterceptorError(error: AxiosError, client: AxiosInstance) {
  const originalRequest = error.config as RetryableAxiosRequestConfig | undefined;

  // Reject immediately if no config, or if the refresh request itself failed
  if (!originalRequest || originalRequest.url?.includes("/auth/token/")) {
    return Promise.reject(error);
  }

  // Handle 401 Unauthorized
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    try {
      const newAccess = await refreshAccessToken();
      // Ensure headers exist
      if (!originalRequest.headers) {
        originalRequest.headers = new axios.AxiosHeaders();
      }
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return client.request(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }

  return Promise.reject(error);
}
