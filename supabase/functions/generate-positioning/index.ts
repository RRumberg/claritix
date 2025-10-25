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
              role: "user",
              content: `Context: We're building ${productName}, targeted at ${targetAudience}. The product helps them ${productBenefit}.

Task: Write 3 positioning statements in the style of David Ogilvy. Make them emotionally resonant, short, punchy, and specific.

Guidelines:
- Avoid buzzwords and generic jargon.
- Speak directly to the *emotional core* of the customer.
- Prioritize clarity over cleverness.
- Use brand tone that is confident, intelligent, and empathetic.
- Each statement must be under 20 words.

Output Format:
Return ONLY 3 plain text statements separated by line breaks. No numbering, no bullet points, no bold text, no introductions, no explanations. Just the 3 statements.

Constraints:
Don't use corporate language like "synergy," "cutting-edge," or "revolutionary."

Inputs:
- Target Audience: ${targetAudience}
- Top 3 Pain Points: ${painPoints}
- Product Benefit: ${productBenefit}
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

Task: Write 3 unique value propositions. Each must be under 15 words. Make them punchy, real, and irresistible.

Guidelines:
- Benefit first, logic second
- Be visceral and specific
- Sound like a promise that feels true and urgent
- Avoid abstract claims

Output Format:
Return ONLY 3 plain text lines. No numbers. No bullet points. No labels like "Emotional hook:" or "(Focus:". No parentheses. No asterisks. No bold. No formatting whatsoever. Just 3 simple sentences, one per line.

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
              content: `Context: The brand stands for ${differentiators}. Our audience feels ${painPoints}, and our product helps them ${productBenefit}.

Task: Write a **Tagline** in the tone of classic advertising legends. It should be short (3–6 words), emotionally sticky, and worthy of living on a billboard.

Guidelines:
- Capture the soul of the product in the fewest words possible.
- Make it sound timeless — like it's always been true.
- Avoid trendy or techy language. Go for feeling and clarity.
- Echo the tone of Nike's "Just Do It" or Apple's "Think Different."

Constraints:
Maximum 6 words. Output 5 options, separated with ;

Inputs:
- Target Audience: ${targetAudience}
- Top pain: ${painPoints}
- Core value: ${productBenefit}
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
    let tagline = taglineData.choices?.[0]?.message?.content || "";
    
    console.log("tagline_raw:", tagline);
    
    // Simple cleanup: remove extra whitespace and newlines
    tagline = tagline.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
    console.log("tagline_formatted:", tagline);

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
