import { Footer } from "@/components/Footer";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye, Edit, Clock, AlertTriangle } from "lucide-react";

interface Submission {
  id: string;
  type: string;
  title: string;
  entity: string;
  submittedBy: string;
  submittedDate: string;
  status: string;
  severity?: string;
  description: string;
  sources?: string[];
}

export default function ModerationDashboard() {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Mock pending submissions
  const pendingSubmissions = [
    {
      id: "sub-1",
      type: "allegation",
      title: "Irregular Contract Award Process",
      entity: "John Doe - Former Minister",
      submittedBy: "Anonymous",
      submittedDate: "2024-01-15",
      status: "pending",
      severity: "high",
      description: "Evidence suggests irregularities in the awarding of a major infrastructure contract...",
      sources: ["https://example.com/news1", "https://example.com/report1"]
    },
    {
      id: "sub-2",
      type: "response",
      title: "Response to Misappropriation Allegation",
      entity: "Jane Smith - Former Director",
      submittedBy: "jane.smith@verified.com",
      submittedDate: "2024-01-14",
      status: "pending",
      description: "I categorically deny these allegations and provide the following documentation..."
    },
    {
      id: "sub-3",
      type: "allegation",
      title: "Conflict of Interest in Procurement",
      entity: "ABC Organization",
      submittedBy: "citizen@example.com",
      submittedDate: "2024-01-13",
      status: "under-review",
      severity: "medium",
      description: "The organization awarded contracts to companies owned by board members..."
    }
  ];

  const handleApprove = (id: string) => {
    toast({
      title: "Submission Approved",
      description: "The submission has been published to the platform.",
    });
  };

  const handleReject = (id: string) => {
    toast({
      title: "Submission Rejected",
      description: "The submission has been rejected and will not be published.",
      variant: "destructive"
    });
  };

  const handleRequestChanges = (id: string) => {
    toast({
      title: "Changes Requested",
      description: "The contributor has been notified of the required changes.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Moderation Dashboard | Jawafdehi</title>
      </Helmet>
      <Header />

      <main id="main-content" className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Moderation Dashboard</h1>
            <p className="text-muted-foreground">Review and manage submitted allegations and responses</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Review</p>
                    <p className="text-2xl font-bold text-foreground">12</p>
                  </div>
                  <Clock className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Under Review</p>
                    <p className="text-2xl font-bold text-foreground">5</p>
                  </div>
                  <Eye className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Approved Today</p>
                    <p className="text-2xl font-bold text-foreground">8</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Flagged</p>
                    <p className="text-2xl font-bold text-foreground">3</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending">Pending Review</TabsTrigger>
              <TabsTrigger value="under-review">Under Review</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingSubmissions.map((submission) => (
                <Card key={submission.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={submission.type === "allegation" ? "destructive" : "default"}>
                            {submission.type === "allegation" ? "Allegation" : "Response"}
                          </Badge>
                          {submission.severity && (
                            <Badge variant="outline">{submission.severity} severity</Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {submission.submittedDate}
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {submission.title}
                        </h3>

                        <p className="text-sm text-muted-foreground mb-2">
                          Entity: <span className="font-medium">{submission.entity}</span>
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Submitted by: <span className="font-medium">{submission.submittedBy}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(submission)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{submission.title}</DialogTitle>
                              <DialogDescription>
                                Review submission details before making a decision
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div>
                                <p className="text-sm font-medium leading-none">Entity</p>
                                <p className="text-sm">{submission.entity}</p>
                              </div>

                              <div>
                                <p className="text-sm font-medium leading-none">Type</p>
                                <p className="text-sm capitalize">{submission.type}</p>
                              </div>

                              {submission.severity && (
                                <div>
                                  <p className="text-sm font-medium leading-none">Severity</p>
                                  <p className="text-sm capitalize">{submission.severity}</p>
                                </div>
                              )}

                              <div>
                                <p className="text-sm font-medium leading-none">Description</p>
                                <p className="text-sm whitespace-pre-wrap">{submission.description}</p>
                              </div>

                              {submission.sources && (
                                <div>
                                  <p className="text-sm font-medium leading-none">Sources</p>
                                  <ul className="text-sm list-disc list-inside">
                                    {submission.sources.map((source: string, idx: number) => (
                                      <li key={idx}>
                                        <a href={source} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                          {source}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div>
                                <p className="text-sm font-medium leading-none">Submitted By</p>
                                <p className="text-sm">{submission.submittedBy}</p>
                              </div>

                              <div>
                                <p className="text-sm font-medium leading-none">Submitted Date</p>
                                <p className="text-sm">{submission.submittedDate}</p>
                              </div>

                              {/* Moderation Actions */}
                              <div className="space-y-4 pt-4 border-t">
                                <div>
                                  <Label htmlFor={`moderation-status-${submission.id}`}>Assign Status</Label>
                                  <Select defaultValue="pending">
                                    <SelectTrigger id={`moderation-status-${submission.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="under-review">Under Review</SelectItem>
                                      <SelectItem value="verified">Verified</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label htmlFor={`moderation-notes-${submission.id}`}>Moderation Notes (Internal)</Label>
                                  <Textarea
                                    id={`moderation-notes-${submission.id}`}
                                    placeholder="Add notes for other moderators..."
                                    rows={3}
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleApprove(submission.id)}
                                    className="flex-1"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve & Publish
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => handleRequestChanges(submission.id)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Request Changes
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleReject(submission.id)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="under-review">
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No submissions currently under review
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approved">
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  View approved submissions history
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rejected">
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  View rejected submissions history
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />


    </div>
  );
}
