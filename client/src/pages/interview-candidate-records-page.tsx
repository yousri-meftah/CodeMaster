import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { Film, Loader2, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { resolveApiUrl } from "@/services/api";
import { CandidateReviewShell, useCandidateReviewData } from "@/components/interviews/candidate-review-shared";

const InterviewCandidateRecordsPage = () => {
  const params = useParams<{ id: string; candidateId: string }>();
  const interviewId = Number(params.id);
  const candidateId = Number(params.candidateId);
  const { interview, candidate, candidateLogs, orderedMediaSegments, loading } = useCandidateReviewData(interviewId, candidateId);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);

  const selectedSegment = useMemo(() => {
    if (selectedSegmentId) {
      return orderedMediaSegments.find((segment) => segment.id === selectedSegmentId) ?? orderedMediaSegments[0] ?? null;
    }
    return orderedMediaSegments[0] ?? null;
  }, [orderedMediaSegments, selectedSegmentId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading recordings...
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

  const selectedUrl = resolveApiUrl(selectedSegment?.download_url);

  return (
    <div className="space-y-6">
      <CandidateReviewShell
        interviewId={interviewId}
        candidateId={candidateId}
        interview={interview}
        candidate={candidate}
        activeTab="records"
        completedProblems={candidate.completed_problem_count}
        mediaCount={orderedMediaSegments.length}
        logCount={candidateLogs.length}
      />

      <div className="grid items-stretch gap-6 xl:grid-cols-12">
        <Card className="overflow-hidden xl:col-span-8">
          <CardHeader className="border-b bg-card/60">
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              Recording Player
            </CardTitle>
            <CardDescription>Review the candidate recording segment by segment.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {!selectedSegment || !selectedUrl ? (
              <div className="rounded-3xl border border-dashed p-10 text-sm text-muted-foreground">
                No playable recording is available yet for this candidate.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[28px] border bg-slate-950 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.28)]">
                  <video key={selectedSegment.id} controls preload="metadata" className="aspect-video w-full rounded-[20px] bg-black" src={selectedUrl} />
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <Badge variant="outline">Segment #{selectedSegment.sequence_number}</Badge>
                  <Badge variant="outline">{selectedSegment.media_kind}</Badge>
                  <Badge variant="outline">{selectedSegment.mime_type}</Badge>
                  <Badge variant="outline">{typeof selectedSegment.duration_ms === "number" ? `${Math.round(selectedSegment.duration_ms / 1000)}s` : "Unknown duration"}</Badge>
                  <Badge variant={selectedSegment.upload_status === "uploaded" ? "secondary" : "outline"}>{selectedSegment.upload_status}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-[640px] flex-col overflow-hidden xl:col-span-4">
          <CardHeader className="border-b bg-card/60">
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Pick a segment from the interview timeline.</CardDescription>
          </CardHeader>
          <ScrollArea className="min-h-0 flex-1">
            <CardContent className="space-y-3 p-4">
              {orderedMediaSegments.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                  No recordings yet. Check the logs page for device or upload issues.
                </div>
              ) : (
                orderedMediaSegments.map((segment) => {
                  const active = segment.id === selectedSegment?.id;
                  return (
                    <button
                      key={segment.id}
                      type="button"
                      onClick={() => setSelectedSegmentId(segment.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/40 dark:hover:bg-slate-950/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">Segment #{segment.sequence_number}</p>
                          <p className={`mt-1 text-xs ${active ? "text-white/70 dark:text-slate-600" : "text-muted-foreground"}`}>
                            {segment.started_at ? new Date(segment.started_at).toLocaleTimeString() : "Unknown start"}
                            {segment.ended_at ? ` to ${new Date(segment.ended_at).toLocaleTimeString()}` : ""}
                          </p>
                        </div>
                        <PlayCircle className={`h-5 w-5 ${active ? "text-white dark:text-slate-950" : "text-muted-foreground"}`} />
                      </div>
                      <div className={`mt-3 flex flex-wrap gap-2 text-xs ${active ? "text-white/80 dark:text-slate-700" : "text-muted-foreground"}`}>
                        <span>{segment.size_bytes} bytes</span>
                        <span>{typeof segment.duration_ms === "number" ? `${Math.round(segment.duration_ms / 1000)}s` : ""}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default InterviewCandidateRecordsPage;
