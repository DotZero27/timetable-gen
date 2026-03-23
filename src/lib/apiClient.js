import axios from "axios";

/**
 * Shared axios instance for client-side API calls.
 *
 * Error contract:
 * - API errors are returned as JSON like `{ error: string }`.
 * - We normalize axios errors so hooks/components can use `err.message`
 *   and (optionally) `err.data?.rule`.
 */
export const apiClient = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err?.response?.data;
    if (data && typeof data === "object") {
      if (typeof data.error === "string") {
        err.message = data.error;
      } else if (typeof data.message === "string") {
        err.message = data.message;
      }
      err.data = data;
    }
    return Promise.reject(err);
  }
);

