import { Link, useParams } from "wouter";
import { Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidateReviewShell, formatEventLabel, useCandidateReviewData } from "@/components/interviews/candidate-review-shared";

const InterviewCandidateLogsPage = () => {
  const params = useParams<{ id: string; candidateId: string }>();
  const interviewId = Number(params.id);
  const candidateId = Number(params.candidateId);
  const { interview, candidate, candidateLogs, orderedMediaSegments, loading } = useCandidateReviewData(interviewId, candidateId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading logs...
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

  return (
    <div className="space-y-6">
      <CandidateReviewShell
        interviewId={interviewId}
        candidateId={candidateId}
        interview={interview}
        candidate={candidate}
        activeTab="logs"
        completedProblems={candidate.completed_problem_count}
        mediaCount={orderedMediaSegments.length}
        logCount={candidateLogs.length}
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader className="border-b bg-card/60">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Activity Timeline
            </CardTitle>
            <CardDescription>Every anti-cheat and session activity signal captured during the interview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {candidateLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-sm text-muted-foreground">
                No logs yet. If the candidate has not started or triggered any activity event, nothing appears here.
              </div>
            ) : (
              candidateLogs.map((log, index) => (
                <div key={log.id} className="relative rounded-3xl border bg-card/50 p-5">
                  <div className="absolute left-5 top-6 h-full w-px bg-border/60" />
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 h-4 w-4 rounded-full border-4 border-background bg-primary" />
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold">{formatEventLabel(log.event_type)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{log.event_type}</p>
                      </div>
                      <Badge variant="outline">{log.timestamp ? new Date(log.timestamp).toLocaleString() : `Event ${index + 1}`}</Badge>
                    </div>
                    {log.meta && (
                      <pre className="mt-4 overflow-x-auto rounded-2xl border bg-muted/30 p-4 text-xs">{JSON.stringify(log.meta, null, 2)}</pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InterviewCandidateLogsPage;
