import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Public REST endpoint used by our nutrition automation.
// NOTE: this is intentionally the same base used by `parse-meal-nutrition`.
const TACO_API_BASE = "https://taco.deno.dev/api/v1";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const query = url.searchParams.get("q");
    const foodId = url.searchParams.get("id");

    let tacoUrl: string;

    if (action === "search" && query) {
      // taco.deno.dev uses a `q` parameter for searching foods
      tacoUrl = `${TACO_API_BASE}/foods?q=${encodeURIComponent(query)}`;
    } else if (action === "get" && foodId) {
      tacoUrl = `${TACO_API_BASE}/foods/${foodId}`;
    } else if (action === "all") {
      tacoUrl = `${TACO_API_BASE}/foods`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'search', 'get', or 'all'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching TACO API: ${tacoUrl}`);

    const response = await fetch(tacoUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`TACO API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: `TACO API returned ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in taco-proxy:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
