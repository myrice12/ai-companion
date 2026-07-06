const API_BASE = "http://localhost:8000";

const originalFetch = window.fetch.bind(window);

function rewriteUrl(input: RequestInfo | URL): RequestInfo | URL {
  let url: string;
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else {
    url = input.url;
  }
  if (url.startsWith("/api/")) {
    return `${API_BASE}${url}`;
  }
  return input;
}

window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  return originalFetch(rewriteUrl(input) as RequestInfo, init);
}) as typeof window.fetch;

export {};