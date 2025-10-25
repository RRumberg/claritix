import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered</span>
          </div>
          <h1 className="mb-2 text-5xl font-bold tracking-tight">
            Claritix
          </h1>
          <p className="text-lg text-muted-foreground">
            Turn vague product descriptions into clear messaging that wins markets, not just meetings.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Section */}
          <Card className="p-8 shadow-lg transition-shadow hover:shadow-xl">
            <h2 className="mb-6 text-2xl font-semibold">Product Information</h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  placeholder="Enter your product name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="transition-all focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Textarea
                  id="targetAudience"
                  placeholder="Describe your ideal customer and target market"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  rows={3}
                  className="resize-none transition-all focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="painPoints">Top 3 Pain Points</Label>
                <Textarea
                  id="painPoints"
                  placeholder="What problems does your product solve?"
                  value={painPoints}
                  onChange={(e) => setPainPoints(e.target.value)}
                  rows={3}
                  className="resize-none transition-all focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productBenefit">Product Benefit</Label>
                <Textarea
                  id="productBenefit"
                  placeholder="What value does your product deliver?"
                  value={productBenefit}
                  onChange={(e) => setProductBenefit(e.target.value)}
                  rows={3}
                  className="resize-none transition-all focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitors">Key Competitors</Label>
                <Textarea
                  id="competitors"
                  placeholder="Who are your main competitors?"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                  rows={3}
                  className="resize-none transition-all focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="differentiators">Differentiators</Label>
                <Textarea
                  id="differentiators"
                  placeholder="What makes your product unique?"
                  value={differentiators}
                  onChange={(e) => setDifferentiators(e.target.value)}
                  rows={3}
                  className="resize-none transition-all focus:ring-2 focus:ring-primary"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-accent shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
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
                className="w-full shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
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
            <Card className="p-8 shadow-lg transition-shadow hover:shadow-xl">
              <h3 className="mb-4 text-xl font-semibold text-primary">
                Positioning Statement
              </h3>
              <div className="min-h-[120px] rounded-lg bg-muted/50 p-4">
                {positioning ? (
                  <p className="leading-relaxed text-foreground">{positioning}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Your positioning statement will appear here...
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-8 shadow-lg transition-shadow hover:shadow-xl">
              <h3 className="mb-4 text-xl font-semibold text-primary">
                Unique Value Proposition (UVP)
              </h3>
              <div className="min-h-[120px] rounded-lg bg-muted/50 p-4">
                {uvp ? (
                  <p className="leading-relaxed text-foreground">{uvp}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Your UVP will appear here...
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-8 shadow-lg transition-shadow hover:shadow-xl">
              <h3 className="mb-4 text-xl font-semibold text-primary">
                Tagline
              </h3>
              <div className="min-h-[80px] rounded-lg bg-muted/50 p-4">
                {tagline ? (
                  <p className="text-xl font-medium leading-relaxed text-foreground">
                    {tagline}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Your tagline will appear here...
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-8 shadow-lg transition-shadow hover:shadow-xl">
              <h3 className="mb-4 text-xl font-semibold text-primary">
                AI-powered insights
              </h3>
              <div className="min-h-[120px] rounded-lg bg-muted/50 p-4">
                {insights ? (
                  <p className="leading-relaxed text-foreground">{insights}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Fill out the product information form to generate professional marketing messages tailored to your product and audience.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
