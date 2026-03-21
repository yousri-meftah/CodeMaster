import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import CodeEditor from "@/components/CodeEditor";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { interviewSessionAPI, problemsAPI, submissionsAPI, type CandidateSession, type SubmissionResult } from "@/services/api";
import { Loader2, Play, Send, Timer } from "lucide-react";

type ProblemStarterCode = {
  id: number;
  language: string;
  code: string;
};

type ProblemDetail = {
  id: number;
  title: string;
  difficulty: string;
  description?: string | null;
  constraints?: string | null;
  starter_codes?: ProblemStarterCode[];
};

const defaultStarter = {
  javascript: "function solve(input) {\n  // TODO\n}\n\nsolve(require('fs').readFileSync(0, 'utf8'));\n",
  python: "def solve(data: str):\n    pass\n\nif __name__ == '__main__':\n    import sys\n    solve(sys.stdin.read())\n",
  java: "public class Main {\n    public static void main(String[] args) throws Exception {\n    }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n",
  algo: "algorithme solve\n\ndebut\n    // TODO\nfin\n",
};

const getToken = () => new URLSearchParams(window.location.search).get("token") ?? "";

const InterviewSessionPage = () => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const token = getToken();
  const [selectedProblemId, setSelectedProblemId] = useState<number | null>(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [tick, setTick] = useState(0);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<SubmissionResult | null>(null);
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);

  const codeRef = useRef(code);
  const languageRef = useRef(language);
  const problemIdRef = useRef<number | null>(selectedProblemId);
  const loggingEnabledRef = useRef(true);
  const closingRef = useRef(false);

  const sessionQuery = useQuery<CandidateSession>({
    queryKey: ["candidate-session-active", token],
    queryFn: () => interviewSessionAPI.getSession(token),
    enabled: Boolean(token),
    retry: false,
    refetchInterval: 30000,
    refetchOnMount: "always",
  });

  const session = sessionQuery.data;

  useEffect(() => {
    if (session?.status === "pending" || session?.status === "expired" || session?.status === "submitted") {
      sessionStorage.removeItem("interview_active_token");
      setLocation(`/challenge?token=${encodeURIComponent(token)}`);
    }
  }, [session?.status, setLocation, token]);

  useEffect(() => {
    if (session?.status === "started") {
      sessionStorage.setItem("interview_active_token", token);
    }
  }, [session?.status, token]);

  useEffect(() => {
    if (!selectedProblemId && session?.problems?.length) {
      const first = [...session.problems].sort((a, b) => a.order - b.order)[0];
      setSelectedProblemId(first.id);
    }
  }, [selectedProblemId, session?.problems]);

  const currentProblemMeta = useMemo(
    () => session?.problems.find((problem) => problem.id === selectedProblemId) ?? null,
    [selectedProblemId, session?.problems],
  );

  const currentProblemQuery = useQuery<ProblemDetail>({
    queryKey: ["interview-problem", selectedProblemId],
    queryFn: () => problemsAPI.getProblemById(String(selectedProblemId)),
    enabled: !!selectedProblemId,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { token: string; problem_id: number; language: string; code: string }) =>
      interviewSessionAPI.save(payload),
    onSuccess: () => {
      setIsDirty(false);
    },
    onError: (error: Error) => {
      toast({ title: "Autosave failed", description: error.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => interviewSessionAPI.submit(token),
    onSuccess: (candidate) => {
      loggingEnabledRef.current = false;
      sessionStorage.removeItem("interview_active_token");
      queryClient.invalidateQueries({ queryKey: ["candidate-session-active", token] });
      queryClient.invalidateQueries({ queryKey: ["candidate-session", token] });
      queryClient.setQueryData(["candidate-session", token], (previous: CandidateSession | undefined) =>
        previous
          ? {
              ...previous,
              status: candidate.status,
              started_at: candidate.started_at ?? previous.started_at,
              submitted_at: candidate.submitted_at ?? previous.submitted_at,
            }
          : previous,
      );
      toast({ title: "Interview submitted", description: "Your responses have been recorded." });
      setLocation(`/challenge/thank-you?token=${encodeURIComponent(token)}`);
    },
    onError: (error: Error) => {
      loggingEnabledRef.current = true;
      toast({ title: "Submit failed", description: error.message, variant: "destructive" });
    },
  });

  const logMutation = useMutation({
    mutationFn: (payload: { token: string; event_type: string; meta?: Record<string, unknown> }) =>
      interviewSessionAPI.log(payload),
  });

  const runMutation = useMutation({
    mutationFn: () =>
      submissionsAPI.run({
        problem_id: Number(selectedProblemId),
        language,
        code,
      }),
    onSuccess: (result) => {
      setExecutionResult(result);
      setActiveCaseIndex(0);
      const output = result.cases?.map((c) => c.stdout ?? "").join("\n") ?? "";
      setRunOutput(output || "No output");
    },
    onError: (error: Error) => {
      setExecutionResult(null);
      setRunOutput(`Run failed: ${error.message}`);
    },
  });

  const lastLogRef = useRef<Record<string, number>>({});
  const hashString = (value: string) => {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 33) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  };

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    problemIdRef.current = selectedProblemId;
  }, [selectedProblemId]);

  const storagePrefix = useMemo(() => (token && selectedProblemId ? `interview:${token}:${selectedProblemId}` : ""), [token, selectedProblemId]);

  useEffect(() => {
    if (!currentProblemQuery.data || !storagePrefix) {
      return;
    }
    const starters = currentProblemQuery.data.starter_codes ?? [];
    const availableLanguages = starters.length > 0 ? starters.map((starter) => starter.language.toLowerCase()) : Object.keys(defaultStarter);
    const storedLanguage = localStorage.getItem(`${storagePrefix}:language`);
    const nextLanguage = storedLanguage && availableLanguages.includes(storedLanguage) ? storedLanguage : availableLanguages[0];
    setLanguage(nextLanguage);
  }, [currentProblemQuery.data, storagePrefix]);

  useEffect(() => {
    if (!currentProblemQuery.data || !storagePrefix) {
      return;
    }
    const starters = currentProblemQuery.data.starter_codes ?? [];
    const starterMap = new Map(starters.map((starter) => [starter.language.toLowerCase(), starter.code]));
    const storedCode = localStorage.getItem(`${storagePrefix}:code:${language}`);
    const nextCode = storedCode ?? starterMap.get(language) ?? defaultStarter[language as keyof typeof defaultStarter] ?? "";
    setCode(nextCode);
    setIsDirty(false);
  }, [currentProblemQuery.data, language, storagePrefix]);

  useEffect(() => {
    if (!storagePrefix) {
      return;
    }
    localStorage.setItem(`${storagePrefix}:language`, language);
    localStorage.setItem(`${storagePrefix}:code:${language}`, code);
  }, [code, language, storagePrefix]);

  useEffect(() => {
    if (!token || session?.status !== "started") {
      return;
    }
    const interval = window.setInterval(() => {
      if (!isDirty || !problemIdRef.current || !codeRef.current.trim()) {
        return;
      }
      saveMutation.mutate({
        token,
        problem_id: problemIdRef.current,
        language: languageRef.current,
        code: codeRef.current,
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isDirty, saveMutation, token, session?.status]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!token || !session || session.status !== "started" || !session.settings?.anti_cheat) {
      return;
    }
    const logWithCooldown = (eventType: string, meta?: Record<string, unknown>) => {
      if (!loggingEnabledRef.current || submitMutation.isPending) {
        return;
      }
      const now = Date.now();
      const last = lastLogRef.current[eventType] ?? 0;
      if (now - last < 5000) {
        return;
      }
      lastLogRef.current[eventType] = now;
      logMutation.mutate({ token, event_type: eventType, meta });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        logWithCooldown("tab_hidden", { path: window.location.pathname });
      }
    };
    const onBlur = () => {
      logWithCooldown("window_blur");
    };
    const onCopy = () => {
      logWithCooldown("copy");
    };
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text") ?? "";
      logWithCooldown("paste", text
        ? { length: text.length, hash: hashString(text) }
        : undefined);
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        logWithCooldown("shortcut", { key: event.key });
      }
    };
    let idleTimer: number | undefined;
    const resetIdle = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        logWithCooldown("idle", { seconds: 60 });
      }, 60000);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKeydown);
    ["mousemove", "keydown", "click", "scroll"].forEach((eventName) => {
      window.addEventListener(eventName, resetIdle);
    });
    resetIdle();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKeydown);
      ["mousemove", "keydown", "click", "scroll"].forEach((eventName) => {
        window.removeEventListener(eventName, resetIdle);
      });
      if (idleTimer) window.clearTimeout(idleTimer);
    };
  }, [logMutation, session, submitMutation.isPending, token]);

  useEffect(() => {
    if (!token || session?.status !== "started") {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Leaving will submit and end your interview.";
      closingRef.current = true;
    };
    const pageHideHandler = () => {
      if (!closingRef.current) {
        return;
      }
      const payload = JSON.stringify({ token });
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(
        `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/interview/submit`,
        blob,
      );
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", pageHideHandler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", pageHideHandler);
    };
  }, [session?.status, token]);

  const handleProblemChange = (problemId: number) => {
    if (isDirty && problemIdRef.current && codeRef.current.trim()) {
      saveMutation.mutate({
        token,
        problem_id: problemIdRef.current,
        language: languageRef.current,
        code: codeRef.current,
      });
    }
    setSelectedProblemId(problemId);
  };

  const handleRun = async () => {
    if (!selectedProblemId) {
      return;
    }
    await runMutation.mutateAsync();
  };

  const timeLeft = useMemo(() => {
    if (!session?.expires_at) {
      return null;
    }
    const diff = new Date(session.expires_at).getTime() - Date.now();
    if (diff <= 0) {
      return "00:00";
    }
    const totalSeconds = Math.floor(diff / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [session?.expires_at, sessionQuery.dataUpdatedAt, tick]);

  const starterLanguages = useMemo(() => {
    const starters = currentProblemQuery.data?.starter_codes ?? [];
    const langs = starters.map((starter) => starter.language.toLowerCase());
    return langs.length > 0 ? langs : Object.keys(defaultStarter);
  }, [currentProblemQuery.data?.starter_codes]);

  const runCases = executionResult?.cases ?? [];
  const activeRunCase = runCases[activeCaseIndex];

  useEffect(() => {
    if (runCases.length === 0) {
      return;
    }
    if (activeCaseIndex >= runCases.length) {
      setActiveCaseIndex(0);
    }
  }, [activeCaseIndex, runCases.length]);

  if (!token) {
    return <Redirect to="/challenge" />;
  }

  if (sessionQuery.isLoading || !session) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading active session...
      </div>
    );
  }

  if (session.status !== "started") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Session unavailable</CardTitle>
            <CardDescription>This interview is not in an active state. Return to the session page for the current status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation(`/challenge?token=${encodeURIComponent(token)}`)}>Back to session page</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/5">
        <CardContent className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{session.candidate_email}</p>
            <h1 className="text-2xl font-semibold">{session.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{session.status}</Badge>
            <Badge variant="outline" className="px-3 py-1 text-sm">
              <Timer className="mr-2 h-4 w-4" />
              {timeLeft ?? "--:--"}
            </Badge>
            <Button variant="outline" onClick={handleRun} disabled={!selectedProblemId || runMutation.isPending}>
              {runMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Run
            </Button>
            <Button
              onClick={async () => {
                if (!window.confirm("Submit the interview now?")) return;
                loggingEnabledRef.current = false;
                if (isDirty && selectedProblemId) {
                  await saveMutation.mutateAsync({
                    token,
                    problem_id: selectedProblemId,
                    language,
                    code,
                  });
                }
                await submitMutation.mutateAsync();
              }}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit Interview
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Problems</CardTitle>
            <CardDescription>Switching problems keeps your code locally and on autosave.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...session.problems]
                .sort((a, b) => a.order - b.order)
                .map((problem, index) => (
                  <button
                    key={problem.id}
                    type="button"
                    onClick={() => handleProblemChange(problem.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left ${
                      selectedProblemId === problem.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{index + 1}. {problem.title}</span>
                      <Badge variant="outline">{problem.difficulty}</Badge>
                    </div>
                  </button>
                ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{currentProblemMeta?.title ?? "Problem"}</CardTitle>
              <CardDescription>{currentProblemMeta?.description ?? "Review the prompt and write your solution."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentProblemMeta?.constraints && (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                  <span className="font-medium">Constraints:</span> {currentProblemMeta.constraints}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {starterLanguages.map((lang) => (
                  <Button
                    key={lang}
                    size="sm"
                    variant={language === lang ? "default" : "outline"}
                    onClick={() => setLanguage(lang)}
                  >
                    {lang}
                  </Button>
                ))}
              </div>
              <div className="h-[520px]">
                <CodeEditor
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setIsDirty(true);
                  }}
                  language={language as "javascript" | "python" | "java" | "cpp" | "algo"}
                  height="520px"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Run Output</CardTitle>
              <CardDescription>Run your code against sample tests.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {runCases.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {runCases.map((tc, index) => (
                        <Button
                          key={tc.id ?? index}
                          size="sm"
                          variant={index === activeCaseIndex ? "default" : "outline"}
                          onClick={() => setActiveCaseIndex(index)}
                        >
                          Case {index + 1}
                        </Button>
                      ))}
                    </div>
                    {activeRunCase && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs uppercase text-muted-foreground">Input</p>
                          <pre className="mt-2 text-sm">{activeRunCase.input_text ?? ""}</pre>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs uppercase text-muted-foreground">Expected</p>
                          <pre className="mt-2 text-sm">{activeRunCase.output_text ?? ""}</pre>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs uppercase text-muted-foreground">Your Output</p>
                          <pre className="mt-2 text-sm">{activeRunCase.stdout ?? ""}</pre>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs uppercase text-muted-foreground">Error</p>
                          <pre className="mt-2 text-sm">{activeRunCase.stderr ?? ""}</pre>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <ScrollArea className="h-28 rounded-lg border p-4">
                    <pre className="text-sm text-muted-foreground">{runOutput ?? "Run your code to see output."}</pre>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewSessionPage;
