
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export async function api(path, options = {}) {
  const url = `${API_BASE_URL}/api${path}`;

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to the server. Please check your backend connection."
    );
  }

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));

    throw new Error(
      result.error || `Server request failed (${response.status})`
    );
  }

  return response.json();
}

export const money = (n) =>
  "₱" +
  Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const date = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
