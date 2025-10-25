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

Task: Write a **Positioning Statement** in the style of David Ogilvy. Make it emotionally resonant, short, punchy, and specific — like a copywriter who deeply understands the customer's pain and aspiration.

Guidelines:
- Avoid buzzwords and generic jargon.
- Speak directly to the *emotional core* of the customer.
- Prioritize clarity over cleverness.
- Use brand tone that is confident, intelligent, and empathetic.
- Output 3 tight variations, each under 20 words.

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

Task: Craft a **Unique Value Proposition** that captures the *emotional and functional value* in one clear, bold sentence — the kind that could go on a homepage hero banner.

Guidelines:
- Follow copywriting principles: benefit first, logic second.
- Channel classic Ogilvy copy: punchy, real, irresistible.
- Make it sound like a promise that feels true and urgent.
- Avoid abstract claims — be visceral and specific.

Constraints:
Keep each version under 15 words. No fluff. Give me 3 variations, each with a distinct emotional hook.

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
              content: `You are David Ogilvy writing taglines.

Write exactly THREE taglines, one per line (no bullets, no numbering, no quotes, no punctuation at the end). Each line must be 3–5 words, plain language, memorable, and grounded in a concrete image.

Voice & taste:
- Sound like a human with taste, not a slogan generator.
- Aim at one emotion (relief, control, confidence, pride) and one concrete outcome.
- Use concrete nouns or images (e.g., map, boots, gate, ledger, signal, season, acre, row, dust, rain, dashboard).
- Prefer strong verb + concrete noun ("verb the noun") or "noun + noun".

Do NOT:
- Do not include product or brand names.
- Do not use buzzwords (platform, solution, AI-powered, innovative, optimize, transform).
- Do not use the words: grow, value, goals, achieve, future, simply, better, data, clarity, smarter, trust.
- Do not repeat the same main verb or the same main noun across the three lines.

Format: Return plain text only, exactly three lines, each a separate tagline, no extra text.

Inputs:
- Audience: ${targetAudience}
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
    
    console.log("tagline_raw_length:", tagline.length);
    
    // Deterministic tagline formatter
    function formatTaglines(raw: string, competitors: string): string {
      const brandTokens = new Set(
        competitors
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter(Boolean)
      );
      const buzzwords = new Set(["innovative","seamless","nextgen","next-gen","revolutionary","cuttingedge","cutting-edge","transform","empower","synergy","leverage","reimagine","reimagination"]);
      const emotionWords = new Set(["relief","control","confident","confidence","profit","clarity","simple","easy","easily","smarter","faster","calm","clean","clear"]);

      // Split into candidates by common separators and punctuation
      const parts = raw
        .replace(/\n+/g, " ")
        .split(/[•·\u2022|/;]|[.?!]+|—|–|,|\|/g)
        .map(s => s.replace(/["'""''(){}\[\]-]/g, " "))
        .flatMap(s => s.split(/[\n\r]+/))
        .map(s => s.replace(/\s+/g, " ").trim())
        .filter(Boolean);

      function cleanCandidate(s: string): string {
        let t = s.replace(/[.,!?;:/"'""''(){}\[\]-]/g, " ");
        t = t.replace(/\s+/g, " ").trim();
        return t;
      }

      function hasBuzz(s: string): boolean {
        const t = s.toLowerCase().replace(/[^a-z0-9\s]/g,"");
        return t.split(/\s+/).some(w => buzzwords.has(w));
      }

      function stripBrands(s: string): string {
        const words = s.split(/\s+/);
        const kept = words.filter(w => !brandTokens.has(w.toLowerCase()));
        return kept.join(" ").trim();
      }

      function to3to5Words(s: string): string | null {
        const words = s.split(/\s+/).filter(Boolean);
        if (words.length < 3) return null;
        const trimmed = words.slice(0, 5);
        if (trimmed.length < 3) return null;
        return trimmed.join(" ");
      }

      const candidates: string[] = [];
      for (let p of parts) {
        let c = cleanCandidate(p);
        if (!c) continue;
        if (hasBuzz(c)) continue;
        c = stripBrands(c);
        if (!c) continue;
        c = cleanCandidate(c);
        const limited = to3to5Words(c);
        if (!limited) continue;
        candidates.push(limited);
      }

      // De-duplicate candidates
      const uniq = Array.from(new Set(candidates.map(c => c.toLowerCase()))).map(u => candidates.find(c => c.toLowerCase() === u)!);

      // Scoring: prefer 4 words, then emotional words
      function score(c: string): number {
        const ws = c.toLowerCase().split(/\s+/);
        const lenScore = -Math.abs(ws.length - 4);
        const emo = ws.reduce((acc,w) => acc + (emotionWords.has(w) ? 1 : 0), 0);
        return lenScore * 10 + emo;
      }

      const sorted = uniq.sort((a,b) => score(b) - score(a));

      // Select with no repeated words across taglines
      const used = new Set<string>();
      const chosen: string[] = [];
      for (const cand of sorted) {
        const tokens = cand.toLowerCase().split(/\s+/);
        const overlaps = tokens.some((t: string) => used.has(t));
        if (!overlaps) {
          chosen.push(cand);
          tokens.forEach((t: string) => used.add(t));
        }
        if (chosen.length === 3) break;
      }

      // Relaxation if needed
      if (chosen.length < 3) {
        for (const cand of sorted) {
          if (chosen.includes(cand)) continue;
          chosen.push(cand);
          if (chosen.length === 3) break;
        }
      }

      // Final fallback if still <3
      while (chosen.length < 3) {
        const fallback = sorted[chosen.length] || "grow your value";
        if (!chosen.includes(fallback)) {
          chosen.push(fallback);
        } else {
          chosen.push("achieve your goals");
        }
      }

      // Final clean: ensure no punctuation and 3–5 words
      const final = chosen.map(c => {
        let t = c.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
        const words = t.split(/\s+/).slice(0,5);
        if (words.length < 3) {
          while (words.length < 3) words.push(words[words.length - 1] || "value");
        }
        return words.join(" ");
      });

      const joined = final.slice(0,3).join(" / ");
      return joined.replace(/\n+/g, " ").trim();
    }
    
    // Apply deterministic formatter
    tagline = formatTaglines(tagline, competitors);
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
