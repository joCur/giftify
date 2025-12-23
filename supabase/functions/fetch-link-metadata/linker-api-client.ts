// HTTP client for linker.curth.dev API

import type { LinkerAPIResponse } from "./types.ts";

const LINKER_API_URL = "https://linker.curth.dev/api/metadata";

export class LinkerAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "LinkerAPIError";
  }
}

/**
 * Fetches link metadata from the Linker API
 *
 * @param url - The URL to fetch metadata for
 * @returns Parsed API response
 * @throws LinkerAPIError if the API key is missing or the request fails
 */
export async function fetchFromLinkerAPI(
  url: string
): Promise<LinkerAPIResponse> {
  const apiKey = Deno.env.get("LINKER_API_KEY");

  if (!apiKey) {
    throw new LinkerAPIError("LINKER_API_KEY not configured");
  }

  const response = await fetch(LINKER_API_URL, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      include_json_ld: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new LinkerAPIError(
      `API request failed: ${errorText}`,
      response.status
    );
  }

  const data: LinkerAPIResponse = await response.json();

  // Check if the API returned an error in the response body
  if (data.error) {
    throw new LinkerAPIError(`API error: ${data.error}`);
  }

  return data;
}
