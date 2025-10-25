import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      productName, 
      targetAudience, 
      painPoints, 
      productBenefit, 
      competitors, 
      differentiators 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating positioning outputs for:", productName);

    // Generate all three outputs in parallel
    const [positioningResponse, uvpResponse, taglineResponse] = await Promise.all([
      // Positioning Statement
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a strategic marketing expert. Create clear, compelling positioning statements."
            },
            {
              role: "user",
              content: `You are a senior product marketer. Write ONE tight paragraph in April Dunford style.

Rules:
- ≤55 words. Plain language. No buzzwords (innovative, seamless, next-gen). No superlatives (best, fastest). No filler.
- Lead with the buyer's situation and sharpest pain. Name the category clearly.
- Contrast against the named competitor using ONE concrete differentiator (feature, workflow, data, or proof).
- Where possible, include a credible proof point (metric, certification, customer).

Structure to follow (but keep it flowing as one paragraph):
For [target customer] who [need/opportunity], the [product name] is a [category] that [key benefit]. Unlike [primary competitor], our product [primary differentiator + mini proof if available].

Inputs:
- Product Name: ${productName}
- Target Audience: ${targetAudience}
- Pain Points: ${painPoints}
- Product Benefit: ${productBenefit}
- Competitors: ${competitors}
- Differentiators: ${differentiators}`
            }
          ]
        }),
      }),

      // Unique Value Proposition
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a strategic marketing expert. Create compelling value propositions that clearly communicate unique benefits."
            },
            {
              role: "user",
              content: `You are a senior product marketer. Write exactly ONE sentence, ≤25 words.

Rules:
- Plain, specific. No buzzwords/superlatives/adverbs ("seamlessly").
- Include the ICP, the one job/outcome they care about most, and the single differentiator that makes it credible.
- Prefer verbs over adjectives. Add a light proof fragment if available.

Inputs:
- Product Name: ${productName}
- Target Audience: ${targetAudience}
- Pain Points: ${painPoints}
- Product Benefit: ${productBenefit}
- Differentiators: ${differentiators}`
            }
          ]
        }),
      }),

      // Tagline
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a creative copywriter specializing in memorable brand taglines. Create short, punchy, memorable taglines."
            },
            {
              role: "user",
              content: `You are a senior product marketer. Return 3 distinct taglines as PLAIN TEXT, one per line, no bullets, no numbers, no quotes, no punctuation at the end. Each ≤8 words.

Rules:
- Reflect the ICP's top pain and our key differentiator.
- Avoid clichés ("transform", "reimagine", "next-gen"), rhymes, or wordplay.

Inputs:
- Product Name: ${productName}
- Target Audience: ${targetAudience}
- Top Pain: ${painPoints}
- Differentiator: ${differentiators}`
            }
          ]
        }),
      }),
    ]);

    // Check for rate limiting or payment errors
    if (positioningResponse.status === 429 || uvpResponse.status === 429 || taglineResponse.status === 429) {
      console.error("Rate limit exceeded");
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (positioningResponse.status === 402 || uvpResponse.status === 402 || taglineResponse.status === 402) {
      console.error("Payment required");
      return new Response(
        JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }), 
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!positioningResponse.ok || !uvpResponse.ok || !taglineResponse.ok) {
      console.error("AI gateway error:", {
        positioning: positioningResponse.status,
        uvp: uvpResponse.status,
        tagline: taglineResponse.status
      });
      throw new Error("AI gateway error");
    }

    const [positioningData, uvpData, taglineData] = await Promise.all([
      positioningResponse.json(),
      uvpResponse.json(),
      taglineResponse.json(),
    ]);

    const positioning = positioningData.choices?.[0]?.message?.content || "";
    const uvp = uvpData.choices?.[0]?.message?.content || "";
    const tagline = taglineData.choices?.[0]?.message?.content || "";

    console.log("Successfully generated all positioning outputs");

    return new Response(
      JSON.stringify({
        positioning,
        uvp,
        tagline,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-positioning function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
