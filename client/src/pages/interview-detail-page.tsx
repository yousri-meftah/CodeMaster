import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { interviewsAPI, type InterviewCandidatesPage, type InterviewDetail } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Clock3, Copy, Loader2, Pencil, Trash2, UserPlus, Users } from "lucide-react";
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

const inviteTone = (status: string) => {
  switch (status) {
    case "sent":
      return "default";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
};

const InterviewDetailPage = () => {
  const params = useParams<{ id: string }>();
  const interviewId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [candidateEmails, setCandidateEmails] = useState("");
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidateStatus, setCandidateStatus] = useState<string>("all");
  const [candidateSearch, setCandidateSearch] = useState("");

  const getInviteCooldownSeconds = (sentAt?: string | null, inviteStatus?: string) => {
    if (!sentAt || inviteStatus !== "sent") return 0;
    const sentMs = new Date(sentAt).getTime();
    if (Number.isNaN(sentMs)) return 0;
    const elapsed = Math.floor((Date.now() - sentMs) / 1000);
    return Math.max(0, 30 * 60 - elapsed);
  };

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

  const addCandidatesMutation = useMutation({
    mutationFn: () => {
      const emails = candidateEmails
        .split(/[\n,]+/)
        .map((email) => email.trim())
        .filter(Boolean);
      return interviewsAPI.addCandidates(interviewId, emails);
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["interview-candidates", interviewId] });
      setCandidateEmails("");
      setIsAddCandidateOpen(false);
      const failed = payload.invite_results.filter((row) => row.status === "failed").length;
      if (failed > 0) {
        toast({
          title: "Candidates added with invite failures",
          description: `${failed} invite email(s) failed. You can resend from the candidate list.`,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Candidates added", description: "The new candidates are now visible in the list." });
    },
    onError: (error: Error) => {
      toast({ title: "Add candidate failed", description: error.message, variant: "destructive" });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: ({ candidateId }: { candidateId: number }) =>
      interviewsAPI.resendCandidateInvite(interviewId, candidateId),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["interview-candidates", interviewId] });
      if (payload.invite.status === "sent") {
        toast({ title: "Invite sent", description: `Invitation re-sent to ${payload.invite.email}.` });
      } else {
        toast({
          title: "Invite failed",
          description: payload.invite.error ?? "Email delivery failed.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Resend failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteInterviewMutation = useMutation({
    mutationFn: () => interviewsAPI.delete(interviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      toast({ title: "Interview deleted", description: "Interview and related candidates were removed." });
      setLocation("/interviews");
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

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
            <Button variant="outline" onClick={() => setLocation(`/interviews/${interviewId}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              disabled={deleteInterviewMutation.isPending}
              onClick={() => {
                const accepted = window.confirm("Delete this interview permanently?");
                if (!accepted) return;
                deleteInterviewMutation.mutate();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Interview Overview</CardTitle>
            <CardDescription>Quick summary before you drill into a specific candidate.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Candidates
              </CardTitle>
              <CardDescription>Open a dedicated review page for logs, saved code, and candidate assessment.</CardDescription>
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
                      <TableHead>Invite</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((candidate) => (
                      (() => {
                        const cooldownSeconds = getInviteCooldownSeconds(candidate.invite_sent_at, candidate.invite_status);
                        const isResendDisabled = cooldownSeconds > 0;
                        const isRowPending =
                          resendInviteMutation.isPending &&
                          resendInviteMutation.variables?.candidateId === candidate.id;
                        return (
                      <TableRow
                        key={candidate.id}
                        className="cursor-pointer"
                        onClick={() => setLocation(`/interviews/${interviewId}/candidates/${candidate.id}`)}
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
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={inviteTone(candidate.invite_status) as "default" | "secondary" | "destructive" | "outline"}>
                              {candidate.invite_status}
                            </Badge>
                            {candidate.invite_status === "failed" && candidate.invite_error && (
                              <p className="max-w-56 truncate text-xs text-destructive" title={candidate.invite_error}>
                                {candidate.invite_error}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {candidate.started_at ? new Date(candidate.started_at).toLocaleString() : "Not started"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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
                            <Button
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setLocation(`/interviews/${interviewId}/candidates/${candidate.id}`);
                              }}
                            >
                              Review
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={isResendDisabled || isRowPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                resendInviteMutation.mutate({ candidateId: candidate.id });
                              }}
                            >
                              {isRowPending
                                ? "Sending..."
                                : isResendDisabled
                                  ? `Resend in ${Math.ceil(cooldownSeconds / 60)}m`
                                  : "Resend Invite"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                        );
                      })()
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
    </div>
  );
};

export default InterviewDetailPage;
