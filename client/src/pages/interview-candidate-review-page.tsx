import { Link, useParams } from "wouter";
import { CheckCircle2, FileCode2, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CandidateReviewShell,
  formatEventLabel,
  useCandidateReviewData,
} from "@/components/interviews/candidate-review-shared";

const InterviewCandidateReviewPage = () => {
  const params = useParams<{ id: string; candidateId: string }>();
  const interviewId = Number(params.id);
  const candidateId = Number(params.candidateId);
  const { interview, candidate, candidateSubmissions, candidateLogs, orderedMediaSegments, loading } = useCandidateReviewData(interviewId, candidateId);

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

  const reviewedProblems = interview.problems.map((problem) => ({
    ...problem,
    submission: candidateSubmissions.find((item) => item.problem_id === problem.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <CandidateReviewShell
        interviewId={interviewId}
        candidateId={candidateId}
        interview={interview}
        candidate={candidate}
        activeTab="overview"
        completedProblems={candidate.completed_problem_count}
        mediaCount={orderedMediaSegments.length}
        logCount={candidateLogs.length}
      />

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-7">
          <CardHeader className="border-b bg-card/60">
            <CardTitle>Problem Map</CardTitle>
            <CardDescription>Coverage and the latest saved state for each interview problem.</CardDescription>
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
                          untouched
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

        <Card className="xl:col-span-5">
          <CardHeader className="border-b bg-card/60">
            <CardTitle>Signal Summary</CardTitle>
            <CardDescription>A quick read on recordings, alerts, and recent session activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Started</p>
                <p className="mt-2 text-sm">{candidate.started_at ? new Date(candidate.started_at).toLocaleString() : "Not started"}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</p>
                <p className="mt-2 text-sm">{candidate.submitted_at ? new Date(candidate.submitted_at).toLocaleString() : "Not submitted"}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Recordings</p>
                <p className="mt-2 text-2xl font-black">{orderedMediaSegments.length}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Alerts</p>
                <p className="mt-2 text-2xl font-black">{candidateLogs.length}</p>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/10 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Latest signals</p>
              </div>
              {candidateLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No anti-cheat or activity logs recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {candidateLogs.slice(0, 5).map((log) => (
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

        <Card className="xl:col-span-12">
          <CardHeader className="border-b bg-card/60">
            <CardTitle>Saved Code</CardTitle>
            <CardDescription>The latest snapshots saved during the interview session.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {candidateSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-sm text-muted-foreground">
                No saved code yet. Once the candidate writes or autosaves code, it appears here.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {candidateSubmissions.map((submission) => (
                  <div key={submission.id} className="rounded-3xl border bg-card/50 p-4">
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
                    <ScrollArea className="mt-4 h-72 rounded-2xl border bg-muted/30 p-4">
                      <pre className="whitespace-pre-wrap font-mono text-xs">{submission.code}</pre>
                    </ScrollArea>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InterviewCandidateReviewPage;
