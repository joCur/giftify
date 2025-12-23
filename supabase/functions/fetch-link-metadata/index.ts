// Supabase Edge Function to fetch link metadata via Linker API
// This keeps the API key secure on the server side

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchFromLinkerAPI, LinkerAPIError } from "./linker-api-client.ts";
import { mapToLinkMetadata, createFallbackMetadata } from "./metadata-mapper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 500) {
  return jsonResponse({ error: message }, status);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    // Verify Supabase environment is configured
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return errorResponse("Supabase configuration missing", 500);
    }

    // Create Supabase client to verify token
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // Parse request body
    let url: string;
    try {
      const body = await req.json();
      url = body.url;
    } catch {
      return errorResponse("Invalid JSON in request body", 400);
    }

    if (!url || typeof url !== "string") {
      return errorResponse("URL is required", 400);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return errorResponse("Invalid URL format", 400);
    }

    // Fetch metadata from Linker API and map to response format
    try {
      const apiResponse = await fetchFromLinkerAPI(url);
      const metadata = mapToLinkMetadata(apiResponse, url);
      return jsonResponse(metadata);
    } catch (apiError) {
      console.error("Linker API error:", apiError);

      // If it's a configuration error, return 500
      if (
        apiError instanceof LinkerAPIError &&
        apiError.message.includes("not configured")
      ) {
        return errorResponse("Link preview service not configured", 500);
      }

      // Return fallback metadata for other API errors
      const metadata = createFallbackMetadata(url);
      return jsonResponse(metadata);
    }
  } catch (error) {
    console.error("Error fetching link metadata:", error);
    return errorResponse("Failed to fetch link metadata", 500);
  }
});
