export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly messages: string[] = [message]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...rest } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    credentials: "include",
    cache: "no-store",
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedBody =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};

    const statusObj =
      "status" in parsedBody &&
      typeof parsedBody.status === "object" &&
      parsedBody.status !== null
        ? (parsedBody.status as Record<string, unknown>)
        : {};

    let extractedMessages: string[] = [];

    if ("messages" in statusObj) {
      if (typeof statusObj.messages === "string") {
        extractedMessages = [statusObj.messages];
      } else if (Array.isArray(statusObj.messages)) {
        extractedMessages = statusObj.messages.map(String);
      }
    } else if ("message" in parsedBody) {
      if (typeof parsedBody.message === "string") {
        extractedMessages = [parsedBody.message];
      } else if (Array.isArray(parsedBody.message)) {
        extractedMessages = parsedBody.message.map(String);
      }
    }

    const message =
      extractedMessages.length > 0
        ? extractedMessages.join("; ")
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, extractedMessages);
  }

  if (typeof body === "object" && body !== null && "data" in body) {
    return (body as { data: T }).data;
  }

  return body as T;
}
