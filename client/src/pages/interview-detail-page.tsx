import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { interviewsAPI, type InterviewCandidate, type InterviewCandidatesPage, type InterviewDetail, type InterviewLog, type InterviewSubmission } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Clock3, Copy, Loader2, ShieldAlert, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusTone = (status: string) => {
  switch (status) {
    case "submitted":
      return "default";
    case "started":
      return "secondary";
    case "expired":
      return "destructive";
    default:
      return "outline";
  }
};

const formatEventLabel = (eventType: string) => {
  switch (eventType) {
    case "tab_hidden":
      return "Candidate left or hid the interview tab";
    case "window_blur":
      return "Candidate switched focus to another window/app";
    case "copy":
      return "Candidate copied content during the interview";
    case "paste":
      return "Candidate pasted content during the interview";
    default:
      return eventType;
  }
};

const InterviewDetailPage = () => {
  const params = useParams<{ id: string }>();
  const interviewId = Number(params.id);
  const { toast } = useToast();
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [candidateEmails, setCandidateEmails] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidateStatus, setCandidateStatus] = useState<string>("all");
  const [candidateSearch, setCandidateSearch] = useState("");

  const { data: interview, isLoading } = useQuery<InterviewDetail>({
    queryKey: ["interview", interviewId],
    queryFn: () => interviewsAPI.getById(interviewId),
    enabled: !Number.isNaN(interviewId),
  });

  const { data: candidatesPage } = useQuery<InterviewCandidatesPage>({
    queryKey: ["interview-candidates", interviewId, candidatePage, candidateStatus, candidateSearch],
    queryFn: () =>
      interviewsAPI.getCandidates(interviewId, {
        page: candidatePage,
        page_size: 20,
        status: candidateStatus === "all" ? undefined : candidateStatus,
        search: candidateSearch || undefined,
      }),
    enabled: !Number.isNaN(interviewId),
  });

  const candidates = candidatesPage?.items ?? [];
  const totalCandidates = candidatesPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCandidates / (candidatesPage?.page_size ?? 20)));

  const { data: submissions = [] } = useQuery<InterviewSubmission[]>({
    queryKey: ["interview-submissions", interviewId],
    queryFn: () => interviewsAPI.getSubmissions(interviewId),
    enabled: !Number.isNaN(interviewId),
  });

  const { data: logs = [] } = useQuery<InterviewLog[]>({
    queryKey: ["interview-logs", interviewId],
    queryFn: () => interviewsAPI.getLogs(interviewId),
    enabled: !Number.isNaN(interviewId),
  });

  const addCandidatesMutation = useMutation({
    mutationFn: () => {
      const emails = candidateEmails
        .split(/[\n,]+/)
        .map((email) => email.trim())
        .filter(Boolean);
      return interviewsAPI.addCandidates(interviewId, emails);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-candidates", interviewId] });
      setCandidateEmails("");
      setIsAddCandidateOpen(false);
      toast({ title: "Candidates added", description: "The new candidates are now visible in the list." });
    },
    onError: (error: Error) => {
      toast({ title: "Add candidate failed", description: error.message, variant: "destructive" });
    },
  });

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId],
  );
  const candidateSubmissions = useMemo(
    () => submissions.filter((submission) => submission.candidate_id === selectedCandidateId),
    [selectedCandidateId, submissions],
  );
  const candidateLogs = useMemo(
    () => logs.filter((log) => log.candidate_id === selectedCandidateId),
    [logs, selectedCandidateId],
  );

  useEffect(() => {
    setCandidatePage(1);
  }, [candidateStatus, candidateSearch]);

  const copyCandidateLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/challenge?token=${token}`);
      toast({ title: "Link copied", description: "Candidate interview link copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard access failed.", variant: "destructive" });
    }
  };

  if (isLoading || !interview) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading interview...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link href="/interviews" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to interviews
        </Link>
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5">
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{interview.status}</Badge>
                <Badge variant="outline">{interview.difficulty || "Unspecified"}</Badge>
                <Badge variant="outline">
                  <Clock3 className="mr-1 h-3 w-3" />
                  {interview.duration_minutes} min
                </Badge>
                <Badge variant="outline">Valid {interview.availability_days} day{interview.availability_days === 1 ? "" : "s"}</Badge>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{interview.title}</h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {interview.description || "No description provided."}
                </p>
              </div>
            </div>
            <Button onClick={() => setIsAddCandidateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Candidates
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Candidates
              </CardTitle>
              <CardDescription>Click a candidate to open their activity panel and review progress.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
                <Input
                  placeholder="Search by email"
                  value={candidateSearch}
                  onChange={(event) => setCandidateSearch(event.target.value)}
                />
                <Select value={candidateStatus} onValueChange={setCandidateStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="started">Started</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {candidates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No candidates yet. Add candidates to generate interview links.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead className="text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate) => (
                      <TableRow
                        key={candidate.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedCandidateId(candidate.id)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{candidate.email}</p>
                            <p className="text-xs text-muted-foreground">Candidate #{candidate.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusTone(candidate.status) as "default" | "secondary" | "destructive" | "outline"}>
                            {candidate.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {candidate.started_at ? new Date(candidate.started_at).toLocaleString() : "Not started"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              copyCandidateLink(candidate.token);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {totalCandidates > 0 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Page {candidatePage} of {totalPages} ({totalCandidates} candidates)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={candidatePage <= 1}
                      onClick={() => setCandidatePage((prev) => Math.max(1, prev - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={candidatePage >= totalPages}
                      onClick={() => setCandidatePage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Problems In This Interview</CardTitle>
              <CardDescription>Reference list for the questions included in the interview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {interview.problems
                .sort((a, b) => a.order - b.order)
                .map((problem, index) => (
                  <div key={problem.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{index + 1}. {problem.title}</p>
                      <Badge variant="outline">{problem.difficulty}</Badge>
                    </div>
                    {problem.description && <p className="mt-2 text-sm text-muted-foreground">{problem.description}</p>}
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Interview Overview</CardTitle>
            <CardDescription>Quick summary before you drill into a specific candidate.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Candidates (page)</p>
              <p className="mt-2 text-2xl font-semibold">{candidates.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Submitted (page)</p>
              <p className="mt-2 text-2xl font-semibold">{candidates.filter((candidate) => candidate.status === "submitted").length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Active (page)</p>
              <p className="mt-2 text-2xl font-semibold">{candidates.filter((candidate) => candidate.status === "started").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Candidates</DialogTitle>
            <DialogDescription>Paste one or many emails. Each candidate will get a unique interview link.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={candidateEmails}
            onChange={(event) => setCandidateEmails(event.target.value)}
            placeholder="candidate1@example.com&#10;candidate2@example.com"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCandidateOpen(false)}>Cancel</Button>
            <Button onClick={() => addCandidatesMutation.mutate()} disabled={!candidateEmails.trim() || addCandidatesMutation.isPending}>
              {addCandidatesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Candidates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selectedCandidate)} onOpenChange={(open) => !open && setSelectedCandidateId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          {selectedCandidate && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCandidate.email}</SheetTitle>
                <SheetDescription>
                  Review status, saved code, and activity logs for this candidate.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                    <div className="mt-2">
                      <Badge variant={statusTone(selectedCandidate.status) as "default" | "secondary" | "destructive" | "outline"}>
                        {selectedCandidate.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Started</p>
                    <p className="mt-2 text-sm">{selectedCandidate.started_at ? new Date(selectedCandidate.started_at).toLocaleString() : "Not started"}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</p>
                    <p className="mt-2 text-sm">{selectedCandidate.submitted_at ? new Date(selectedCandidate.submitted_at).toLocaleString() : "Not submitted"}</p>
                  </div>
                </div>

                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <ShieldAlert className="h-5 w-5" />
                    Activity Logs
                  </h3>
                  {candidateLogs.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      No logs yet. If the candidate has not started or triggered any activity event, nothing appears here.
                    </div>
                  ) : (
                    candidateLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{formatEventLabel(log.event_type)}</p>
                            <p className="text-xs text-muted-foreground">{log.event_type}</p>
                          </div>
                          <Badge variant="outline">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "event"}</Badge>
                        </div>
                        {log.meta && (
                          <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">{JSON.stringify(log.meta, null, 2)}</pre>
                        )}
                      </div>
                    ))
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-semibold">Saved Submissions</h3>
                  {candidateSubmissions.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                      No saved code yet. If the candidate has not started or has not saved anything, this stays empty.
                    </div>
                  ) : (
                    candidateSubmissions.map((submission) => (
                      <div key={submission.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">Problem #{submission.problem_id}</p>
                            <p className="text-xs text-muted-foreground">{submission.language}</p>
                          </div>
                          <Badge variant="outline">
                            {submission.created_at ? new Date(submission.created_at).toLocaleString() : "saved"}
                          </Badge>
                        </div>
                        <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">{submission.code}</pre>
                      </div>
                    ))
                  )}
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default InterviewDetailPage;
