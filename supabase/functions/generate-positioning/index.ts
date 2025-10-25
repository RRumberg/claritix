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

    // Generate positioning, UVP, and tagline in parallel (first batch)
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
              role: "user",
              content: `Context: We're building ${productName}, targeted at ${targetAudience}. The product helps them ${productBenefit}.

Task: Write ONE powerful, emotional Positioning Statement for ${productName}. 

Requirements:
- One complete sentence, 25–35 words
- Explain the unique benefit to ${targetAudience}
- Contrast with competitors (reference: ${competitors})
- End on a vision for the future
- Make it emotionally resonant and specific
- Speak to the customer's pain and aspiration
- Avoid buzzwords and corporate jargon

Output Format:
Return ONLY the positioning statement. No title, no formatting, no explanation. Just the single sentence.

Inputs:
- Target Audience: ${targetAudience}
- Top 3 Pain Points: ${painPoints}
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
              role: "user",
              content: `Context: The product is ${productName} for ${targetAudience}, and solves ${painPoints} in a way that ${differentiators}.

Task: Write 3 unique value propositions in the style of David Ogilvy and April Dunford.

Requirements:
- Each must be a single, complete sentence under 25 words
- Emotionally compelling copy that speaks to customer pain and aspiration
- Strategically differentiated positioning that highlights what makes this unique
- Clear benefit statement that resonates immediately
- Avoid abstract claims - be visceral and specific

Output Format:
Return ONLY 3 plain text sentences separated by line breaks. No numbers. No bullet points. No labels. No formatting. Just 3 complete sentences.

Inputs:
- Product Name: ${productName}
- Target Audience: ${targetAudience}
- Top 3 Pain Points: ${painPoints}
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
              role: "user",
              content: `Write 5 short, emotionally compelling taglines for ${productName}. Each should be under 10 words. Avoid formatting of any kind — do not bold, italicize, or number them. Do not use asterisks (**) or any markdown formatting. Just return clean, plain text lines separated by semicolons.

Context:
- Target Audience: ${targetAudience}
- Pain Points: ${painPoints}
- Product Benefit: ${productBenefit}
- Differentiators: ${differentiators}

Requirements:
- Each tagline under 10 words
- Emotionally compelling
- No formatting whatsoever (no **, no *, no _, no numbers, no bullet points)
- Plain text only
- Separate with semicolons`
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

    let uvp = uvpData.choices?.[0]?.message?.content || "";
    let tagline = taglineData.choices?.[0]?.message?.content || "";
    
    // Remove all ** markdown formatting from outputs
    positioning = positioning.replace(/\*\*/g, "");
    uvp = uvp.replace(/\*\*/g, "");
    tagline = tagline.replace(/\*\*/g, "");
    
    console.log("tagline_raw:", tagline);
    
    // Simple cleanup: remove extra whitespace and newlines
    tagline = tagline.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
    console.log("tagline_formatted:", tagline);

    // Now generate insights using the completed outputs
    const businessSummary = `Product: ${productName}. Target Audience: ${targetAudience}. Pain Points: ${painPoints}. Benefit: ${productBenefit}. Competitors: ${competitors}. Differentiators: ${differentiators}`;
    
    const insightsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `You're a senior brand strategist trained in positioning (April Dunford) and emotionally resonant copywriting (David Ogilvy). Based on the company summary and messaging outputs below, give a strategic messaging insight in under 100 words. Include: - What message angle is strongest - One suggestion to refine the Positioning, UVP, or Tagline - One overlooked message or opportunity to elevate Use confident, practical language. Do not use any formatting like bold, italic, Markdown, asterisks, or quotation marks. Return plain text only.

Company Summary: ${businessSummary}

Messaging Outputs:
Positioning Statement: ${positioning}
Unique Value Proposition: ${uvp}
Tagline: ${tagline}`
          }
        ]
      }),
    });

    if (!insightsResponse.ok) {
      console.error("AI gateway error for insights:", insightsResponse.status);
      throw new Error("Failed to generate insights");
    }

    const insightsData = await insightsResponse.json();
    let insights = insightsData.choices?.[0]?.message?.content || "";
    insights = insights.replace(/\*\*/g, "");

    console.log("Successfully generated all positioning outputs");

    return new Response(
      JSON.stringify({
        positioning,
        uvp,
        tagline,
        insights,
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
