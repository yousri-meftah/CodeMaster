import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, CheckCircle2, ClipboardList, Clock3, Copy, FileCode2, Loader2, ShieldAlert, UserRound, XCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { interviewsAPI, type InterviewCandidateReview, type InterviewDetail, type InterviewLog, type InterviewSubmission } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

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
    case "mouse_activity":
      return "Candidate mouse movement activity snapshot";
    default:
      return eventType;
  }
};

const InterviewCandidateReviewPage = () => {
  const params = useParams<{ id: string; candidateId: string }>();
  const interviewId = Number(params.id);
  const candidateId = Number(params.candidateId);
  const { toast } = useToast();

  const { data: interview, isLoading: interviewLoading } = useQuery<InterviewDetail>({
    queryKey: ["interview", interviewId],
    queryFn: () => interviewsAPI.getById(interviewId),
    enabled: !Number.isNaN(interviewId),
  });

  const { data: candidate, isLoading: candidateLoading } = useQuery<InterviewCandidateReview>({
    queryKey: ["interview-candidate-review", interviewId, candidateId],
    queryFn: () => interviewsAPI.getCandidateReview(interviewId, candidateId),
    enabled: !Number.isNaN(interviewId),
  });

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<InterviewSubmission[]>({
    queryKey: ["interview-candidate-submissions", interviewId, candidateId],
    queryFn: () => interviewsAPI.getCandidateSubmissions(interviewId, candidateId),
    enabled: !Number.isNaN(interviewId),
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<InterviewLog[]>({
    queryKey: ["interview-candidate-logs", interviewId, candidateId],
    queryFn: () => interviewsAPI.getCandidateLogs(interviewId, candidateId),
    enabled: !Number.isNaN(interviewId),
  });

  const candidateSubmissions = useMemo(
    () => submissions.filter((submission) => submission.candidate_id === candidateId),
    [candidateId, submissions],
  );

  const candidateLogs = useMemo(
    () => logs.filter((log) => log.candidate_id === candidateId),
    [candidateId, logs],
  );

  const reviewedProblems = useMemo(
    () =>
      interview?.problems.map((problem) => ({
        ...problem,
        submission: candidateSubmissions.find((item) => item.problem_id === problem.id) ?? null,
      })) ?? [],
    [candidateSubmissions, interview?.problems],
  );

  const updateCandidateStatusMutation = useMutation({
    mutationFn: (status: string) => interviewsAPI.updateCandidateStatus(interviewId, candidateId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-candidates", interviewId] });
      queryClient.invalidateQueries({ queryKey: ["interview-candidate-review", interviewId, candidateId] });
      toast({ title: "Candidate updated", description: "Candidate status has been changed." });
    },
    onError: (error: Error) => {
      toast({ title: "Status update failed", description: error.message, variant: "destructive" });
    },
  });

  const copyCandidateLink = async () => {
    if (!candidate) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/challenge?token=${candidate.token}`);
      toast({ title: "Link copied", description: "Candidate interview link copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard access failed.", variant: "destructive" });
    }
  };

  const loading = interviewLoading || candidateLoading || submissionsLoading || logsLoading;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading candidate review...
      </div>
    );
  }

  if (!interview || !candidate) {
    return (
      <div className="space-y-4">
        <Link href={`/interviews/${interviewId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to interview
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Candidate not found</CardTitle>
            <CardDescription>The selected candidate could not be loaded for this interview.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const riskScore = candidate.risk_score;
  const completedProblems = candidate.completed_problem_count;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.22),_transparent_34%),linear-gradient(135deg,_hsl(223_58%_11%),_hsl(220_44%_8%))] p-8 text-primary-foreground shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.04),transparent)]" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Link href={`/interviews/${interviewId}`} className="inline-flex items-center text-sm text-white/70 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to interview
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-white/10 bg-white/10 text-white">{interview.title}</Badge>
                <Badge className="border-emerald-300/20 bg-emerald-400/10 text-emerald-200">Dedicated Review</Badge>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/55">Post-Interview Review</p>
                <h1 className="font-headline text-4xl font-extrabold tracking-tight text-white">{candidate.email}</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={copyCandidateLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Candidate Link
              </Button>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Move to Offer Stage
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Current Status</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Badge variant={statusTone(candidate.status) as "default" | "secondary" | "destructive" | "outline"}>
                  {candidate.status}
                </Badge>
                <Select value={candidate.status} onValueChange={(value) => updateCandidateStatusMutation.mutate(value)}>
                  <SelectTrigger className="h-8 w-[140px] border-white/10 bg-black/20 text-white">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="started">Started</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Problems Touched</p>
              <p className="mt-3 text-3xl font-extrabold text-white">{completedProblems}<span className="ml-1 text-sm text-white/50">/ {interview.problems.length}</span></p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Risk Score</p>
              <p className="mt-3 text-3xl font-extrabold text-white">{riskScore}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Last Activity</p>
              <p className="mt-3 text-sm text-white">{candidate.last_seen_at ? new Date(candidate.last_seen_at).toLocaleString() : "No activity recorded"}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="overflow-hidden lg:col-span-5">
          <CardHeader className="border-b bg-card/60">
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              Candidate File
            </CardTitle>
            <CardDescription>Session metadata and quick review context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Started</p>
                <p className="mt-2 text-sm">{candidate.started_at ? new Date(candidate.started_at).toLocaleString() : "Not started"}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</p>
                <p className="mt-2 text-sm">{candidate.submitted_at ? new Date(candidate.submitted_at).toLocaleString() : "Not submitted"}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Duration</p>
                <p className="mt-2 text-sm">{interview.duration_minutes} minutes</p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Validity</p>
                <p className="mt-2 text-sm">{interview.availability_days} day{interview.availability_days === 1 ? "" : "s"}</p>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/10 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Activity Highlights</p>
              </div>
              {candidateLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No anti-cheat or activity logs recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {candidateLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="rounded-xl border border-border/70 bg-background/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{formatEventLabel(log.event_type)}</p>
                        <span className="text-xs text-muted-foreground">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "event"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="border-b bg-card/60">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Problem Breakdown
            </CardTitle>
            <CardDescription>Review saved work and problem coverage across the interview.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Problem</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Save</TableHead>
                  <TableHead className="text-right">Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewedProblems.map((problem) => (
                  <TableRow key={problem.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{problem.title}</p>
                        <p className="text-xs text-muted-foreground">Problem #{problem.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{problem.difficulty}</Badge>
                    </TableCell>
                    <TableCell>
                      {problem.submission ? (
                        <span className="inline-flex items-center gap-2 text-sm text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          saved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-sm text-rose-500">
                          <XCircle className="h-4 w-4" />
                          no submission
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {problem.submission?.updated_at || problem.submission?.created_at
                        ? new Date(problem.submission.updated_at || problem.submission.created_at || "").toLocaleString()
                        : "No saved code"}
                    </TableCell>
                    <TableCell className="text-right">
                      {problem.submission?.change_summary ? (
                        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                          <span>{String(problem.submission.change_summary.inserted_lines ?? 0)}+</span>
                          <span>{String(problem.submission.change_summary.removed_lines ?? 0)}-</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No diff data</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader className="border-b bg-card/60">
            <CardTitle className="flex items-center gap-2">
              <FileCode2 className="h-5 w-5 text-primary" />
              Saved Code
            </CardTitle>
            <CardDescription>Latest snapshots saved during the interview session.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {candidateSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-sm text-muted-foreground">
                No saved code yet. Once the candidate writes or autosaves code, it appears here.
              </div>
            ) : (
              <div className="space-y-4">
                {candidateSubmissions.map((submission) => (
                  <div key={submission.id} className="rounded-2xl border bg-card/50 p-4">
                    <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">Problem #{submission.problem_id}</p>
                        <p className="text-xs text-muted-foreground">{submission.language}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">
                          {(submission.updated_at || submission.created_at) ? new Date(submission.updated_at || submission.created_at || "").toLocaleString() : "saved"}
                        </Badge>
                        {submission.change_summary && (
                          <Badge variant="secondary">
                            {String(submission.change_summary.inserted_lines ?? 0)} inserted / {String(submission.change_summary.removed_lines ?? 0)} removed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ScrollArea className="mt-4 h-72 rounded-xl border bg-muted/30 p-4">
                      <pre className="font-mono text-xs whitespace-pre-wrap">{submission.code}</pre>
                    </ScrollArea>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader className="border-b bg-card/60">
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-primary" />
              Logs & Notes
            </CardTitle>
            <CardDescription>Activity timeline and recruiter evaluation notes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-3">
              {candidateLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  No logs yet. If the candidate has not started or triggered any activity event, nothing appears here.
                </div>
              ) : (
                candidateLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{formatEventLabel(log.event_type)}</p>
                        <p className="text-xs text-muted-foreground">{log.event_type}</p>
                      </div>
                      <Badge variant="outline">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "event"}</Badge>
                    </div>
                    {log.meta && (
                      <pre className="mt-3 overflow-x-auto rounded-xl bg-background/80 p-3 text-xs">{JSON.stringify(log.meta, null, 2)}</pre>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
              <p className="text-sm font-semibold">Interviewer Feedback</p>
              <Textarea
                placeholder="Summarize technical strengths, code quality, communication, and follow-up concerns..."
                className="min-h-40"
              />
              <Button className="w-full">Submit Evaluation</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InterviewCandidateReviewPage;
