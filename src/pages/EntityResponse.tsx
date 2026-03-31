import { Footer } from "@/components/Footer";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, Upload, ShieldCheck } from "lucide-react";

export default function EntityResponse() {
  const { id } = useParams();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Response Submitted",
      description: "Your response has been submitted for verification. You will be contacted for identity verification.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Submit Response | Jawafdehi</title>
      </Helmet>
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link to={`/entity/${id}`}>← Back to Entity Profile</Link>
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <CardTitle className="text-3xl">Submit Your Response</CardTitle>
              </div>
              <CardDescription className="text-base">
                Exercise your right to respond to allegations. Your response will be verified and displayed alongside the allegations on your profile.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identity Verification Notice */}
                <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-semibold mb-1">Identity Verification Required</p>
                    <p className="text-muted-foreground">
                      To ensure authenticity, we will verify your identity through official social media accounts, video call, or other established communication channels before publishing your response.
                    </p>
                  </div>
                </div>

                {/* Select Allegation */}
                <div className="space-y-2">
                  <Label htmlFor="allegation">Select Allegation to Respond To</Label>
                  <Select required>
                    <SelectTrigger id="allegation">
                      <SelectValue placeholder="Choose the allegation you're responding to" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alleg-1">Misappropriation of Development Funds</SelectItem>
                      <SelectItem value="alleg-2">Conflict of Interest in Contract Awards</SelectItem>
                      <SelectItem value="all">Respond to all allegations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Response Type */}
                <div className="space-y-2">
                  <Label htmlFor="responseType">Response Type</Label>
                  <Select required>
                    <SelectTrigger id="responseType">
                      <SelectValue placeholder="Select response type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="denial">Complete Denial</SelectItem>
                      <SelectItem value="clarification">Clarification with Context</SelectItem>
                      <SelectItem value="partial">Partial Acknowledgment</SelectItem>
                      <SelectItem value="full">Full Acknowledgment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Response Content */}
                <div className="space-y-2">
                  <Label htmlFor="response">Your Response</Label>
                  <Textarea
                    id="response"
                    placeholder="Provide your detailed response to the allegation(s)"
                    rows={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Be clear, factual, and professional. Your response will be published exactly as written after verification.
                  </p>
                </div>

                {/* Supporting Evidence */}
                <div className="space-y-2">
                  <Label htmlFor="evidence">Supporting Documents (optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">Upload supporting documents</p>
                    <p className="text-xs text-muted-foreground">Legal documents, official records, etc. (Max 10MB per file)</p>
                    <Input
                      id="evidence"
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-foreground">Contact Information for Verification</h3>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Your full legal name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+977 XXX-XXXXXXX"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verificationMethod">Preferred Verification Method</Label>
                    <Select required>
                      <SelectTrigger id="verificationMethod">
                        <SelectValue placeholder="How should we verify your identity?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="social-media">Official Social Media Account</SelectItem>
                        <SelectItem value="video-call">Video Call</SelectItem>
                        <SelectItem value="official-email">Official Email Domain</SelectItem>
                        <SelectItem value="document">Government-Issued ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verificationDetails">Verification Details</Label>
                    <Textarea
                      id="verificationDetails"
                      placeholder="Provide relevant details (e.g., social media handle, preferred call time, official email address)"
                      rows={3}
                      required
                    />
                  </div>
                </div>

                {/* Legal Notice */}
                <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">Legal Notice</p>
                    <p>Your response will be made public alongside the allegations. Ensure all statements are accurate and truthful. False statements may have legal implications.</p>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox id="accuracy" required />
                    <Label htmlFor="accuracy" className="text-sm cursor-pointer">
                      I confirm that all information provided is accurate and truthful
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox id="verification" required />
                    <Label htmlFor="verification" className="text-sm cursor-pointer">
                      I consent to identity verification through the method specified above
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox id="publication" required />
                    <Label htmlFor="publication" className="text-sm cursor-pointer">
                      I understand my response will be published publicly after verification
                    </Label>
                  </div>
                </div>

                {/* Submit Button */}
                <Button type="submit" className="w-full" size="lg">
                  Submit Response for Verification
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />


    </div>
  );
}
