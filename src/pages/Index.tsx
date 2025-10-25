import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Zap, Users, AlertCircle, TrendingUp, Target } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const Index = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAirtableLoading, setIsAirtableLoading] = useState(false);
  
  // Input fields
  const [productName, setProductName] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [productBenefit, setProductBenefit] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [differentiators, setDifferentiators] = useState("");
  
  // Output fields
  const [positioning, setPositioning] = useState("");
  const [uvp, setUvp] = useState("");
  const [tagline, setTagline] = useState("");
  const [insights, setInsights] = useState("");

  const handleGenerate = async () => {
    // Validation
    if (!productName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a product name",
        variant: "destructive",
      });
      return;
    }

    if (!targetAudience.trim() || !painPoints.trim() || !productBenefit.trim() || 
        !competitors.trim() || !differentiators.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-positioning", {
        body: {
          productName,
          targetAudience,
          painPoints,
          productBenefit,
          competitors,
          differentiators,
        },
      });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setPositioning(data.positioning);
      setUvp(data.uvp);
      setTagline(data.tagline);
      setInsights(data.insights);

      toast({
        title: "Success!",
        description: "Positioning outputs generated successfully",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to generate positioning. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToAirtable = async () => {
    if (!positioning || !uvp || !tagline) {
      toast({
        title: "Missing Data",
        description: "Please generate positioning outputs first",
        variant: "destructive",
      });
      return;
    }

    setIsAirtableLoading(true);

    try {
      const response = await fetch("https://hook.eu2.make.com/a6ya7fmx4z3v2k04lt4qtbn0yj9a3z4w", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_name: productName,
          target_audience: targetAudience,
          pain_points: painPoints,
          benefit: productBenefit,
          competitors: competitors,
          differentiators: differentiators,
          positioning_statement: positioning,
          uvp: uvp,
          tagline: tagline,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send data");
      }

      toast({
        title: "Success!",
        description: "Data sent to Airtable successfully",
      });
    } catch (error) {
      console.error("Error sending to Airtable:", error);
      toast({
        title: "Error",
        description: "Failed to send data to Airtable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAirtableLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  ClaritiX
                </h1>
                <p className="mt-2 text-base text-muted-foreground">
                  Turn vague product descriptions into clear messaging that wins markets, not just meetings.
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Section */}
          <Card className="p-6 shadow-sm">
            <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
              Product Information
              <Sparkles className="h-5 w-5 text-primary" />
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productName" className="flex items-center gap-2">
                  Product Name
                  <Zap className="h-4 w-4 text-orange-500" />
                </Label>
                <Input
                  id="productName"
                  placeholder="e.g., ClaritIX"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience" className="flex items-center gap-2">
                  Target Audience
                  <Target className="h-4 w-4 text-orange-500" />
                </Label>
                <Input
                  id="targetAudience"
                  placeholder="e.g., SaaS founders, Product managers"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="painPoints" className="flex items-center gap-2">
                  Top 3 Pain Points
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </Label>
                <Textarea
                  id="painPoints"
                  placeholder="Describe the main challenges your target audience faces..."
                  value={painPoints}
                  onChange={(e) => setPainPoints(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productBenefit" className="flex items-center gap-2">
                  Product Benefit
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                </Label>
                <Textarea
                  id="productBenefit"
                  placeholder="How does your product solve these pain points? What value does it deliver?"
                  value={productBenefit}
                  onChange={(e) => setProductBenefit(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitors" className="flex items-center gap-2">
                  Key Competitors
                  <Users className="h-4 w-4 text-orange-500" />
                </Label>
                <Input
                  id="competitors"
                  placeholder="e.g., Jasper, Copy.ai, ChatGPT"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="differentiators" className="flex items-center gap-2">
                  Differentiators
                  <Sparkles className="h-4 w-4 text-orange-500" />
                </Label>
                <Textarea
                  id="differentiators"
                  placeholder="What makes your product unique compared to competitors?"
                  value={differentiators}
                  onChange={(e) => setDifferentiators(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate
                  </>
                )}
              </Button>

              <Button
                onClick={handleSendToAirtable}
                disabled={isAirtableLoading || !positioning}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isAirtableLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send to Airtable"
                )}
              </Button>
            </div>
          </Card>

          {/* Output Section */}
          <div className="space-y-6">
            <Card className="overflow-hidden shadow-sm">
              <div className="bg-primary/5 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
                    <span className="text-xl">🎯</span>
                  </div>
                  <h3 className="text-lg font-semibold">
                    Positioning Statement
                  </h3>
                </div>
              </div>
              <div className="min-h-[120px] p-6">
                {positioning ? (
                  <p className="leading-relaxed text-foreground">{positioning}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Where your product stands - and why it matters
                  </p>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden shadow-sm">
              <div className="bg-orange-500/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
                    <span className="text-xl">✨</span>
                  </div>
                  <h3 className="text-lg font-semibold">
                    Unique Value Proposition (UVP)
                  </h3>
                </div>
              </div>
              <div className="min-h-[120px] p-6">
                {uvp ? (
                  <p className="leading-relaxed text-foreground">{uvp}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Your AI-generated unique value proposition will appear here after you fill out the form and click "Generate"
                  </p>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden shadow-sm">
              <div className="bg-purple-500/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500">
                    <span className="text-xl">📄</span>
                  </div>
                  <h3 className="text-lg font-semibold">
                    Tagline
                  </h3>
                </div>
              </div>
              <div className="min-h-[100px] p-6">
                {tagline ? (
                  <p className="text-lg font-medium leading-relaxed text-foreground">
                    {tagline}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Your AI-generated tagline will appear here after you fill out the form and click "Generate"
                  </p>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden shadow-sm">
              <div className="bg-primary/5 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
                    <span className="text-xl">💡</span>
                  </div>
                  <h3 className="text-lg font-semibold">
                    Messaging insights
                  </h3>
                </div>
              </div>
              <div className="min-h-[120px] p-6">
                {insights ? (
                  <p className="leading-relaxed text-foreground">{insights}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    The why behind your words. Know what's working - and what to push harder.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>

        <footer className="mt-12 border-t pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 Built by{" "}
            <a
              href="https://www.linkedin.com/in/renerumberg/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Rene Rumberg
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
