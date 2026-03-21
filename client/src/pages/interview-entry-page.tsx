import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { interviewSessionAPI, type CandidateSession } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, TimerReset } from "lucide-react";

const InterviewEntryPage = () => {
  const [, setLocation] = useLocation();
  const [manualToken, setManualToken] = useState("");
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const sessionQuery = useQuery<CandidateSession>({
    queryKey: ["candidate-session", token],
    queryFn: () => interviewSessionAPI.getSession(token),
    enabled: Boolean(token),
    retry: false,
    refetchOnMount: "always",
  });

  const startMutation = useMutation({
    mutationFn: () => interviewSessionAPI.start(token),
    onSuccess: (session) => {
      queryClient.setQueryData(["candidate-session", token], session);
      queryClient.setQueryData(["candidate-session-active", token], session);
      sessionStorage.setItem("interview_active_token", token);
      setLocation(`/challenge/session?token=${encodeURIComponent(token)}`);
    },
  });

  const errorMessage = sessionQuery.error instanceof Error ? sessionQuery.error.message : "";

  if (!token) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Open Interview Session</CardTitle>
            <CardDescription>Paste your candidate token to load the interview briefing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={manualToken} onChange={(event) => setManualToken(event.target.value)} placeholder="Paste token" />
            <Button disabled={!manualToken.trim()} onClick={() => setLocation(`/challenge?token=${encodeURIComponent(manualToken.trim())}`)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading interview session...
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Interview unavailable</CardTitle>
            <CardDescription>The token may be invalid, expired, or already closed.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{errorMessage || "Unable to load session."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = sessionQuery.data;
  const canStart = session.status === "pending";
  const canContinue = session.status === "started";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-3xl">{session.title}</CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-base">
                {session.description || "Timed coding interview"}
              </CardDescription>
            </div>
            <Badge variant="secondary">{session.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Candidate</p>
            <p className="mt-2 font-medium">{session.candidate_email}</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Difficulty</p>
            <p className="mt-2 font-medium">{session.difficulty || "Mixed"}</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Duration</p>
            <p className="mt-2 font-medium">{session.duration_minutes} minutes</p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Link Validity</p>
            <p className="mt-2 font-medium">{session.availability_days} day{session.availability_days === 1 ? "" : "s"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Problems</CardTitle>
            <CardDescription>The interview opens only after you start the timer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {session.problems
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

        <Card>
          <CardHeader>
            <CardTitle>Session Control</CardTitle>
            <CardDescription>Starting the interview begins the timer immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Navigation policy</p>
              <p className="mt-2 font-medium">{String(session.settings?.navigation ?? "restricted")}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Anti-cheat logging</p>
              <p className="mt-2 font-medium">{session.settings?.anti_cheat ? "Enabled" : "Disabled"}</p>
            </div>
            {canStart && (
              <Button className="w-full" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
                {startMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                Start Interview
              </Button>
            )}
            {canContinue && (
              <Button className="w-full" onClick={() => setLocation(`/challenge/session?token=${encodeURIComponent(token)}`)}>
                <TimerReset className="mr-2 h-4 w-4" />
                Continue Interview
              </Button>
            )}
            {session.status === "submitted" && (
              <p className="text-sm text-muted-foreground">This interview has already been submitted.</p>
            )}
            {session.status === "expired" && (
              <p className="text-sm text-muted-foreground">
                This interview link has expired{session.available_until ? ` on ${new Date(session.available_until).toLocaleString()}` : ""}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InterviewEntryPage;
