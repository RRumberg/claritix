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
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: "You are a strategic marketing expert. Create clear, compelling positioning statements."
            },
            {
              role: "user",
              content: `You are David Ogilvy meets April Dunford. Write ONE tight paragraph.

Rules:
- ≤55 words. Plain language. No buzzwords (innovative, seamless, next-gen), no superlatives (best, fastest).
- Lead with the buyer's felt moment (emotion/pain). Name the category clearly.
- Do NOT name competitors. Use neutral contrast: "compared with typical [category] tools" or "versus manual spreadsheets".
- State ONE concrete differentiator and, if available, a short proof fragment (metric, certification, named capability).
- Return plain text only (no bullets/markdown).

Structure (flow as one paragraph):
For [target customer] who [urgent situation/pain], the [product name] is a [category] that [specific outcome]. Compared with typical [category] tools, it [single differentiator + optional proof].

Inputs:
- Product Name: ${productName}
- Target Audience: ${targetAudience}
- Top 3 Pain Points: ${painPoints}
- Product Benefit: ${productBenefit}
- Differentiators: ${differentiators}
- Proof Points (optional): (not provided)
- Category hint (optional): ${competitors}`
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
              content: `You are David Ogilvy writing a one-sentence UVP.

Rules:
- Exactly ONE sentence, ≤22 words. Plain, concrete, memorable.
- Name the ICP, the singular value they care about most, and the ONE differentiator that makes it credible.
- No buzzwords/superlatives/adverbs ("seamlessly"), no competitor mentions, no fluff.
- Prefer strong verbs and tangible nouns. Return plain text only.

Inputs:
- Product Name: ${productName}
- Target Audience: ${targetAudience}
- Top 3 Pain Points: ${painPoints}
- Product Benefit: ${productBenefit}
- Differentiators: ${differentiators}
- Proof Points (optional): (not provided)`
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
              content: `You are David Ogilvy writing taglines.

Goal: Return exactly 3 ultra-short taglines joined on one line with " / " as the separator.

Rules:
- 3–6 words each, plain language.
- No brand names, no buzzwords, no rhymes, no punctuation at the end of each tagline, no quotes, no bullets, no numbering.
- Output must be a single line like: Tagline A / Tagline B / Tagline C
- Focus on one feeling (relief, control, confidence, profit) and one value (what changes for them).
- Avoid verbs like "transform/reimagine/empower"; prefer simple, active words.

Inputs:
- Product: ${productName}
- Audience: ${targetAudience}
- Pain: ${painPoints}
- Value: ${productBenefit}
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

    let positioning = positioningData.choices?.[0]?.message?.content || "";
    
    // Sanitize positioning to remove any brand names
    const sanitizeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You sanitize marketing copy by removing brand names."
          },
          {
            role: "user",
            content: `If the text contains any brand or product names, rewrite it to remove or generalize them.

Use neutral contrast ("compared with typical [category] tools" or "versus manual spreadsheets"). Keep ≤55 words, plain language, same meaning, no buzzwords/superlatives.

Return plain text only.

Inputs:
- Draft: ${positioning}
- Possible brand list: ${competitors}
- Category hint: ${competitors}`
          }
        ]
      }),
    });

    if (sanitizeResponse.ok) {
      const sanitizeData = await sanitizeResponse.json();
      const sanitized = sanitizeData.choices?.[0]?.message?.content;
      if (sanitized) {
        positioning = sanitized;
      }
    }

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
