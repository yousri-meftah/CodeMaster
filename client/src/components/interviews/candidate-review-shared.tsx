import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Activity, CircleDot, Copy, Film, ShieldAlert } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  interviewsAPI,
  type InterviewCandidateReview,
  type InterviewDetail,
  type InterviewLog,
  type InterviewMediaSegment,
  type InterviewSubmission,
} from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const statusTone = (status: string) => {
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

export const formatEventLabel = (eventType: string) => {
  switch (eventType) {
    case "tab_hidden":
      return "Candidate left or hid the interview tab";
    case "window_blur":
      return "Candidate switched focus to another window";
    case "copy":
      return "Candidate copied content";
    case "paste":
      return "Candidate pasted content";
    case "mouse_activity":
      return "Mouse activity snapshot";
    case "media_permission_denied":
      return "Camera or microphone permission was denied";
    case "media_upload_failed":
      return "A recording segment failed to upload";
    case "media_capture_stopped":
      return "Recording stopped before the interview ended";
    case "media_track_ended":
      return "A media device stopped during the interview";
    case "media_finalize_failed":
      return "The client could not finalize media uploads";
    case "media_unsupported":
      return "Browser recording support was unavailable";
    default:
      return eventType;
  }
};

export const useCandidateReviewData = (interviewId: number, candidateId: number) => {
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

  const { data: mediaSegments = [], isLoading: mediaLoading } = useQuery<InterviewMediaSegment[]>({
    queryKey: ["interview-candidate-media", interviewId, candidateId],
    queryFn: () => interviewsAPI.getCandidateMedia(interviewId, candidateId),
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

  const orderedMediaSegments = useMemo(
    () => [...mediaSegments].sort((a, b) => a.sequence_number - b.sequence_number),
    [mediaSegments],
  );

  return {
    interview,
    candidate,
    candidateSubmissions,
    candidateLogs,
    orderedMediaSegments,
    loading: interviewLoading || candidateLoading || submissionsLoading || logsLoading || mediaLoading,
  };
};

type CandidateReviewShellProps = {
  interviewId: number;
  candidateId: number;
  interview: InterviewDetail;
  candidate: InterviewCandidateReview;
  activeTab: "overview" | "records" | "logs";
  completedProblems: number;
  mediaCount: number;
  logCount: number;
};

export const CandidateReviewShell = ({
  interviewId,
  candidateId,
  interview,
  candidate,
  activeTab,
  completedProblems,
  mediaCount,
  logCount,
}: CandidateReviewShellProps) => {
  const { toast } = useToast();

  const updateCandidateStatusMutation = useMutation({
    mutationFn: (status: string) => interviewsAPI.updateCandidateStatus(interviewId, candidateId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-candidates", interviewId] });
      queryClient.invalidateQueries({ queryKey: ["interview-candidate-review", interviewId, candidateId] });
      queryClient.invalidateQueries({ queryKey: ["interview-candidate-submissions", interviewId, candidateId] });
      queryClient.invalidateQueries({ queryKey: ["interview-candidate-logs", interviewId, candidateId] });
      queryClient.invalidateQueries({ queryKey: ["interview-candidate-media", interviewId, candidateId] });
      queryClient.invalidateQueries({ queryKey: ["interview-submissions", interviewId] });
      queryClient.invalidateQueries({ queryKey: ["interview-logs", interviewId] });
      toast({ title: "Candidate updated", description: "Candidate status has been changed." });
    },
    onError: (error: Error) => {
      toast({ title: "Status update failed", description: error.message, variant: "destructive" });
    },
  });

  const copyCandidateLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/challenge?token=${candidate.token}`);
      toast({ title: "Link copied", description: "Candidate interview link copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard access failed.", variant: "destructive" });
    }
  };

  const navItems = [
    { key: "overview", label: "Overview", href: `/interviews/${interviewId}/candidates/${candidateId}`, icon: CircleDot },
    { key: "records", label: "Recordings", href: `/interviews/${interviewId}/candidates/${candidateId}/records`, icon: Film },
    { key: "logs", label: "Logs", href: `/interviews/${interviewId}/candidates/${candidateId}/logs`, icon: Activity },
  ] as const;
  const allowedStatusOptions =
    candidate.status === "submitted"
      ? ["submitted", "pending"]
      : [candidate.status];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_24%),linear-gradient(135deg,#0f172a,#111827_55%,#172554)] p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <Link href={`/interviews/${interviewId}`} className="inline-flex items-center text-sm text-white/70 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to interview
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-white/10 bg-white/10 text-white">{interview.title}</Badge>
                <Badge className="border-emerald-300/15 bg-emerald-400/10 text-emerald-100">Candidate review</Badge>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/45">Candidate dossier</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight">{candidate.email}</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={copyCandidateLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Select value={candidate.status} onValueChange={(value) => updateCandidateStatusMutation.mutate(value)}>
                <SelectTrigger className="h-10 w-[150px] border-white/15 bg-black/20 text-white">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  {allowedStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Status</p>
              <div className="mt-3">
                <Badge variant={statusTone(candidate.status) as "default" | "secondary" | "destructive" | "outline"}>{candidate.status}</Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Problems solved</p>
              <p className="mt-3 text-3xl font-black">{completedProblems}<span className="ml-1 text-sm font-medium text-white/45">/ {interview.problems.length}</span></p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Risk score</p>
              <p className="mt-3 text-3xl font-black">{candidate.risk_score}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Recordings</p>
              <p className="mt-3 text-3xl font-black">{mediaCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Alerts</p>
              <p className="mt-3 text-3xl font-black">{logCount}</p>
            </div>
          </div>
        </div>
      </section>

      <Card className="border-slate-200/70 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/40">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const active = item.key === activeTab;
              const Icon = item.icon;
              return (
                <Link key={item.key} href={item.href}>
                  <Button
                    variant={active ? "default" : "outline"}
                    className={active ? "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200" : ""}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
            <ShieldAlert className="h-4 w-4" />
            {candidate.last_seen_at ? `Last activity ${new Date(candidate.last_seen_at).toLocaleString()}` : "No activity recorded yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
