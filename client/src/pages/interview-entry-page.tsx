import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { interviewSessionAPI, type CandidateSession } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Camera,
  CheckCircle2,
  Cloud,
  FileText,
  Gavel,
  Gauge,
  HelpCircle,
  Loader2,
  Mic,
  PlayCircle,
  ShieldCheck,
  TerminalSquare,
  TimerReset,
} from "lucide-react";

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
      <div className="min-h-screen bg-background px-4 py-10 dark:bg-[#060e20]">
        <div className="mx-auto flex max-w-6xl justify-end">
          <ThemeToggle />
        </div>
        <Card className="mx-auto mt-8 max-w-xl border-border/60 bg-card/90 shadow-2xl dark:border-white/5 dark:bg-[#141f38]">
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
      <div className="min-h-screen bg-background px-4 py-10 dark:bg-[#060e20]">
        <div className="mx-auto flex max-w-6xl justify-end">
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading interview session...
        </div>
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 dark:bg-[#060e20]">
        <div className="mx-auto flex max-w-6xl justify-end">
          <ThemeToggle />
        </div>
        <Card className="mx-auto mt-8 max-w-2xl border-border/60 bg-card/90 shadow-2xl dark:border-white/5 dark:bg-[#141f38]">
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
  const sortedProblems = [...session.problems].sort((a, b) => a.order - b.order);
  const durationLabel = `${session.duration_minutes} minute${session.duration_minutes === 1 ? "" : "s"}`;
  const ruleItems = [
    `Maintain a stable internet connection throughout the ${durationLabel.toLowerCase()} duration.`,
    "External IDEs are permitted, but final code must be submitted in the interview editor.",
    "Camera and microphone checks are shown below and will be used for secure proctoring later.",
  ];

  return (
    <div className="min-h-screen bg-background px-4 pb-6 pt-3 text-foreground dark:bg-[#060e20] dark:text-[#dee5ff]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col">
        <div className="mb-3 flex justify-end">
          <ThemeToggle />
        </div>

        <header className="mb-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.24em] text-muted-foreground dark:border-white/10 dark:bg-[#192540] dark:text-[#a3aac4]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Secure Session Ready
          </div>
          <h1 className="mt-3 font-headline text-2xl font-extrabold tracking-tight md:text-3xl xl:text-4xl">
            {session.title}
          </h1>
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-muted-foreground dark:text-[#a3aac4]">
            {session.description || "Welcome to the secure coding environment. Please complete the lobby checks below before initializing your session."}
          </p>
        </header>

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-7">
            <section className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xl dark:border-white/5 dark:bg-[#1b2744] xl:p-6">
              <div className="mb-5 flex items-center gap-3">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="font-headline text-lg font-bold uppercase tracking-tight">Interview Brief</h2>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground dark:text-[#a3aac4]">Duration</p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold">{session.duration_minutes}</span>
                    <span className="text-sm text-muted-foreground dark:text-[#a3aac4]">Minutes</span>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground dark:text-[#a3aac4]">Problems</p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold">{sortedProblems.length}</span>
                    <span className="text-sm text-muted-foreground dark:text-[#a3aac4]">Challenges</span>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground dark:text-[#a3aac4]">Environment</p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <TerminalSquare className="h-4 w-4 text-emerald-400" />
                    <span className="text-lg font-bold">Secure Runtime</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-border/50 pt-4 dark:border-white/10">
                <p className="text-sm italic leading-6 text-muted-foreground dark:text-[#a3aac4]">
                  &quot;This session focuses on practical implementation, debugging discipline, and clear problem-solving under time pressure.&quot;
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-xl dark:border-white/5 dark:bg-[#0f1930] xl:p-6">
              <div className="mb-5 flex items-center gap-3">
                <Gavel className="h-4 w-4 text-amber-400" />
                <h2 className="font-headline text-lg font-bold uppercase tracking-tight">Rules & Conduct</h2>
              </div>
              <div className="space-y-4">
                {ruleItems.map((rule, index) => (
                  <div key={rule} className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                      {(index + 1).toString().padStart(2, "0")}
                    </div>
                    <p className="leading-7 text-muted-foreground dark:text-[#a3aac4]">{rule}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xl dark:border-white/5 dark:bg-[#0f1930]">
                <ShieldCheck className="h-5 w-5 text-muted-foreground dark:text-[#a3aac4]" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.18em]">Secure Link</h4>
                  <p className="text-xs text-muted-foreground dark:text-[#a3aac4]">Encrypted end-to-end</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xl dark:border-white/5 dark:bg-[#0f1930]">
                <Cloud className="h-5 w-5 text-muted-foreground dark:text-[#a3aac4]" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.18em]">Auto-Save</h4>
                  <p className="text-xs text-muted-foreground dark:text-[#a3aac4]">Real-time persistence</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xl dark:border-white/5 dark:bg-[#0f1930]">
                <HelpCircle className="h-5 w-5 text-muted-foreground dark:text-[#a3aac4]" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.18em]">Support</h4>
                  <p className="text-xs text-muted-foreground dark:text-[#a3aac4]">Live proctor assistance</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 xl:col-span-5">
            <section className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-2xl dark:border-white/5 dark:bg-[#1b2744] xl:p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-headline text-lg font-bold uppercase tracking-tight">System Check</h2>
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400">Live Status</span>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Mic, label: "Microphone", status: "Ready" },
                  { icon: Camera, label: "Camera", status: "Ready" },
                  { icon: Gauge, label: "Network", status: "Optimal" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3 dark:border-white/5 dark:bg-[#141f38]"
                  >
                    <div className="flex items-center gap-4">
                      <item.icon className="h-4 w-4 text-muted-foreground dark:text-[#a3aac4]" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span className="text-sm font-bold">{item.status}</span>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative mt-5 aspect-[16/8.5] overflow-hidden rounded-xl border border-border/60 bg-black/30 dark:border-white/10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.25),transparent_40%),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.48))]" />
                <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Camera className="h-7 w-7" />
                    </div>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Camera Active</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {canStart && (
                  <Button
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-sm font-extrabold uppercase tracking-[0.15em] text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.22)] hover:brightness-105"
                    onClick={() => startMutation.mutate()}
                    disabled={startMutation.isPending}
                  >
                    {startMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                    Initialize Session
                  </Button>
                )}
                {canContinue && (
                  <Button
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-sky-500 text-sm font-extrabold uppercase tracking-[0.15em] shadow-[0_12px_30px_rgba(59,130,246,0.22)]"
                    onClick={() => setLocation(`/challenge/session?token=${encodeURIComponent(token)}`)}
                  >
                    <TimerReset className="mr-2 h-4 w-4" />
                    Continue Interview
                  </Button>
                )}
                {session.status === "submitted" && (
                  <p className="text-center text-sm text-muted-foreground dark:text-[#a3aac4]">
                    This interview has already been submitted.
                  </p>
                )}
                {session.status === "expired" && (
                  <p className="text-center text-sm text-muted-foreground dark:text-[#a3aac4]">
                    This interview link has expired{session.available_until ? ` on ${new Date(session.available_until).toLocaleString()}` : ""}.
                  </p>
                )}
                <p className="text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground dark:text-[#a3aac4]">
                  By continuing, you agree to the secure session terms.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-xl dark:border-white/5 dark:bg-[#141f38]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground dark:text-[#a3aac4]">Candidate</p>
                  <p className="mt-1.5 text-sm font-medium">{session.candidate_email}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground dark:text-[#a3aac4]">Difficulty</p>
                  <p className="mt-1.5 text-sm font-medium">{session.difficulty || "Mixed"}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground dark:text-[#a3aac4]">Navigation</p>
                  <p className="mt-1.5 text-sm font-medium capitalize">{String(session.settings?.navigation ?? "restricted")}</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground dark:text-[#a3aac4]">Anti-cheat</p>
                  <p className="mt-1.5 text-sm font-medium">{session.settings?.anti_cheat ? "Enabled" : "Disabled"}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewEntryPage;
