import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import CodeEditor from "@/components/CodeEditor";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { interviewSessionAPI, problemsAPI, submissionsAPI, type CandidateSession, type SubmissionResult } from "@/services/api";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Send,
  Timer,
  XCircle,
} from "lucide-react";

type MediaState = "idle" | "starting" | "ready" | "warning" | "blocked";

type MediaRecorderWindow = Window & {
  MediaRecorder?: typeof MediaRecorder;
};

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
  test_cases?: {
    id: number;
    input_text: string;
    output_text: string;
    is_sample: boolean;
    order: number;
  }[];
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

const hashString = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

const buildChangeSummary = (previousCode: string, nextCode: string, language: string) => {
  const previousLines = previousCode.split("\n");
  const nextLines = nextCode.split("\n");
  const previousSet = new Set(previousLines);
  const nextSet = new Set(nextLines);

  const insertedLines = nextLines.filter((line) => !previousSet.has(line)).length;
  const removedLines = previousLines.filter((line) => !nextSet.has(line)).length;

  return {
    changed: previousCode !== nextCode,
    language,
    previous_hash: hashString(previousCode),
    next_hash: hashString(nextCode),
    previous_length: previousCode.length,
    next_length: nextCode.length,
    inserted_lines: insertedLines,
    removed_lines: removedLines,
  };
};

const detectLanguageMismatch = (lang: string, source: string) => {
  const normalized = source.trim().toLowerCase();
  if (!normalized) return null;
  const looksLikeJs =
    /\bfunction\b/.test(normalized) ||
    /\bconsole\.log\b/.test(normalized) ||
    /\b(let|const|var)\b/.test(normalized) ||
    /=>/.test(normalized);
  const looksLikePy =
    /\bdef\b/.test(normalized) ||
    /\bprint\(/.test(normalized) ||
    /\bimport\b/.test(normalized);

  if (lang === "python" && looksLikeJs) {
    return "Your code looks like JavaScript, but Python is selected.";
  }
  if (lang === "javascript" && looksLikePy) {
    return "Your code looks like Python, but JavaScript is selected.";
  }
  return null;
};

const getVerdictStyle = (verdict: string) => {
  const normalized = verdict?.toUpperCase?.() ?? "NA";
  switch (normalized) {
    case "AC":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "WA":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "RE":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "IE":
      return "bg-slate-50 text-slate-700 border-slate-200";
    default:
      return "bg-sky-50 text-sky-700 border-sky-200";
  }
};

const getVerdictIcon = (verdict: string) => {
  const normalized = verdict?.toUpperCase?.() ?? "NA";
  switch (normalized) {
    case "AC":
      return <CheckCircle2 className="h-4 w-4" />;
    case "WA":
      return <XCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getCaseTone = (passed: boolean) =>
  passed
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-rose-50 text-rose-700 border-rose-200";

const formatOutput = (value?: string | null) => {
  if (value === null || value === undefined || value === "") return "(no output)";
  if (value.trim() === "") return "(whitespace output)";
  return value;
};

const getLanguageLabel = (lang: string) => {
  switch (lang) {
    case "javascript":
      return "JavaScript";
    case "python":
      return "Python";
    case "java":
      return "Java";
    case "cpp":
      return "C++";
    case "algo":
      return "Algo";
    default:
      return lang.charAt(0).toUpperCase() + lang.slice(1);
  }
};

const getLanguageFileExtension = (lang: string) => {
  switch (lang) {
    case "python":
      return "py";
    case "javascript":
      return "js";
    case "java":
      return "java";
    case "cpp":
      return "cpp";
    default:
      return "txt";
  }
};

const getMediaTone = (state: MediaState) => {
  switch (state) {
    case "ready":
      return "text-emerald-500 dark:text-[#69f6b8]";
    case "starting":
      return "text-sky-500 dark:text-[#7aafff]";
    case "blocked":
      return "text-rose-500 dark:text-rose-300";
    case "warning":
      return "text-amber-500 dark:text-amber-300";
    default:
      return "text-slate-400 dark:text-[#a3aac4]";
  }
};

const getMediaLabel = (state: MediaState) => {
  switch (state) {
    case "ready":
      return "ready";
    case "starting":
      return "starting";
    case "blocked":
      return "blocked";
    case "warning":
      return "warning";
    default:
      return "idle";
  }
};

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
  const [leftWidth, setLeftWidth] = useState(34);
  const [rightResultsHeight, setRightResultsHeight] = useState(32);
  const [cameraState, setCameraState] = useState<MediaState>("idle");
  const [microphoneState, setMicrophoneState] = useState<MediaState>("idle");
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);
  const [uploadedSegments, setUploadedSegments] = useState(0);

  const codeRef = useRef(code);
  const languageRef = useRef(language);
  const problemIdRef = useRef<number | null>(selectedProblemId);
  const storagePrefixRef = useRef("");
  const loggingEnabledRef = useRef(true);
  const closingRef = useRef(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"vertical" | "right-horizontal" | null>(null);
  const mediaPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaSequenceRef = useRef(1);
  const mediaUploadInFlightRef = useRef(0);
  const mediaLogCooldownRef = useRef<Record<string, number>>({});
  const mediaRotateTimeoutRef = useRef<number | null>(null);
  const mediaStopReasonRef = useRef<"idle" | "rotate" | "finalize" | "cleanup">("idle");
  const previousProblemIdRef = useRef<number | null>(null);

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
    mutationFn: (payload: {
      token: string;
      problem_id: number;
      language: string;
      code: string;
      change_summary?: Record<string, unknown>;
    }) =>
      interviewSessionAPI.save(payload),
    onSuccess: () => {
      if (storagePrefixRef.current) {
        localStorage.setItem(`${storagePrefixRef.current}:saved:${languageRef.current}`, codeRef.current);
      }
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
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        mediaStopReasonRef.current = "finalize";
        recorder.stop();
      }
      if (mediaRotateTimeoutRef.current) {
        window.clearTimeout(mediaRotateTimeoutRef.current);
        mediaRotateTimeoutRef.current = null;
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      sessionStorage.removeItem("interview_active_token");
      queryClient.invalidateQueries({ queryKey: ["candidate-session-active", token] });
      queryClient.invalidateQueries({ queryKey: ["candidate-session", token] });
      queryClient.invalidateQueries({ queryKey: ["candidate-media-status", token] });
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

  const mediaStatusQuery = useQuery({
    queryKey: ["candidate-media-status", token],
    queryFn: () => interviewSessionAPI.getMediaStatus(token),
    enabled: Boolean(token) && session?.status === "started",
    refetchInterval: 30000,
  });

  const uploadMediaMutation = useMutation({
    mutationFn: interviewSessionAPI.uploadMediaSegment,
    onSuccess: () => {
      setUploadedSegments((current) => current + 1);
      queryClient.invalidateQueries({ queryKey: ["candidate-media-status", token] });
    },
  });

  const runMutation = useMutation({
    mutationFn: () =>
      submissionsAPI.run({
        problem_id: Number(selectedProblemId),
        language: language.toLowerCase(),
        code,
      }),
    onSuccess: (result) => {
      setExecutionResult(result);
      setActiveCaseIndex(0);
      const output = result.cases?.map((c) => c.stdout ?? "").join("\n") ?? "";
      setRunOutput(output || "No output");
      toast({
        title: result.verdict === "AC" ? "All tests passed!" : "Run completed",
        description: `Verdict: ${result.verdict} (${result.passed}/${result.total} passed)`,
        variant: result.verdict === "AC" ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      setExecutionResult(null);
      setRunOutput(`Run failed: ${error.message}`);
      toast({
        title: "Run failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const lastLogRef = useRef<Record<string, number>>({});

  const logWithCooldown = (eventType: string, meta?: Record<string, unknown>) => {
    if (!token || !loggingEnabledRef.current || submitMutation.isPending) {
      return;
    }
    const now = Date.now();
    const last = mediaLogCooldownRef.current[eventType] ?? lastLogRef.current[eventType] ?? 0;
    if (now - last < 5000) {
      return;
    }
    mediaLogCooldownRef.current[eventType] = now;
    lastLogRef.current[eventType] = now;
    logMutation.mutate({ token, event_type: eventType, meta });
  };

  useEffect(() => {
    if (!mediaStatusQuery.data) {
      return;
    }
    setUploadedSegments(mediaStatusQuery.data.uploaded_segments);
  }, [mediaStatusQuery.data]);

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
    storagePrefixRef.current = storagePrefix;
  }, [storagePrefix]);

  useEffect(() => {
    if (!currentProblemQuery.data || !storagePrefix) {
      return;
    }
    const starters = currentProblemQuery.data.starter_codes ?? [];
    const availableLanguages = starters.length > 0 ? starters.map((starter) => starter.language.toLowerCase()) : Object.keys(defaultStarter);
    const storedLanguage = localStorage.getItem(`${storagePrefix}:language`);
    const nextLanguage =
      storedLanguage && availableLanguages.includes(storedLanguage)
        ? storedLanguage
        : availableLanguages.includes(languageRef.current)
          ? languageRef.current
          : availableLanguages[0];
    previousProblemIdRef.current = selectedProblemId;
    setLanguage(nextLanguage);
  }, [currentProblemQuery.data, selectedProblemId, storagePrefix]);

  useEffect(() => {
    if (!currentProblemQuery.data || !storagePrefix) {
      return;
    }
    const starters = currentProblemQuery.data.starter_codes ?? [];
    const starterMap = new Map(starters.map((starter) => [starter.language.toLowerCase(), starter.code]));
    const storedCode = localStorage.getItem(`${storagePrefix}:code:${language}`);
    const nextCode =
      storedCode && storedCode.length > 0
        ? storedCode
        : starterMap.get(language) ?? defaultStarter[language as keyof typeof defaultStarter] ?? "";
    setCode(nextCode);
    setIsDirty(false);
  }, [currentProblemQuery.data, language, storagePrefix]);

  useEffect(() => {
    if (!storagePrefix || !currentProblemQuery.data) {
      return;
    }
    localStorage.setItem(`${storagePrefix}:language`, language);
    localStorage.setItem(`${storagePrefix}:code:${language}`, code);
  }, [code, currentProblemQuery.data, language, storagePrefix]);

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
        change_summary: buildChangeSummary(
          localStorage.getItem(`${storagePrefix}:saved:${languageRef.current}`) ?? "",
          codeRef.current,
          languageRef.current,
        ),
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isDirty, saveMutation, storagePrefix, token, session?.status]);

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
        ? {
            length: text.length,
            hash: hashString(text),
            preview: text.slice(0, 80),
            lines: text.split("\n").length,
          }
        : undefined);
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        logWithCooldown("shortcut", { key: event.key });
      }
    };
    let mouseDistance = 0;
    let mouseSamples = 0;
    let lastMousePoint: { x: number; y: number } | null = null;
    const onMouseMove = (event: MouseEvent) => {
      if (lastMousePoint) {
        mouseDistance += Math.hypot(event.clientX - lastMousePoint.x, event.clientY - lastMousePoint.y);
      }
      lastMousePoint = { x: event.clientX, y: event.clientY };
      mouseSamples += 1;
    };
    const mouseInterval = window.setInterval(() => {
      if (mouseSamples > 0) {
        logWithCooldown("mouse_activity", {
          samples: mouseSamples,
          distance: Math.round(mouseDistance),
        });
      }
      mouseDistance = 0;
      mouseSamples = 0;
      lastMousePoint = null;
    }, 15000);
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
    window.addEventListener("mousemove", onMouseMove);
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
      window.removeEventListener("mousemove", onMouseMove);
      ["mousemove", "keydown", "click", "scroll"].forEach((eventName) => {
        window.removeEventListener(eventName, resetIdle);
      });
      if (idleTimer) window.clearTimeout(idleTimer);
      window.clearInterval(mouseInterval);
    };
  }, [session, submitMutation.isPending, token]);

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
        `${import.meta.env.VITE_API_BASE_URL ?? "/api"}/interview/submit`,
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
    if (problemId === selectedProblemId) {
      return;
    }
    if (isDirty && problemIdRef.current && codeRef.current.trim()) {
      saveMutation.mutate({
        token,
        problem_id: problemIdRef.current,
        language: languageRef.current,
        code: codeRef.current,
        change_summary: buildChangeSummary(
          localStorage.getItem(`${storagePrefix}:saved:${languageRef.current}`) ?? "",
          codeRef.current,
          languageRef.current,
        ),
      });
    }
    // Clear previous problem context immediately while next problem loads.
    setExecutionResult(null);
    setRunOutput(null);
    setActiveCaseIndex(0);
    setCode("");
    setIsDirty(false);
    setSelectedProblemId(problemId);
  };

  const persistInterviewDrafts = async () => {
    if (!session?.problems?.length) {
      return;
    }

    for (const problem of session.problems) {
      const prefix = `interview:${token}:${problem.id}`;
      const storedLanguage =
        problem.id === selectedProblemId
          ? language
          : localStorage.getItem(`${prefix}:language`) ?? language;
      const draftCode =
        problem.id === selectedProblemId
          ? code
          : localStorage.getItem(`${prefix}:code:${storedLanguage}`) ?? "";

      if (!draftCode.trim()) {
        continue;
      }

      await saveMutation.mutateAsync({
        token,
        problem_id: problem.id,
        language: storedLanguage,
        code: draftCode,
        change_summary: buildChangeSummary(
          localStorage.getItem(`${prefix}:saved:${storedLanguage}`) ?? "",
          draftCode,
          storedLanguage,
        ),
      });

      localStorage.setItem(`${prefix}:saved:${storedLanguage}`, draftCode);
    }
  };

  const finalizeMediaUploads = async () => {
    if (mediaRotateTimeoutRef.current) {
      window.clearTimeout(mediaRotateTimeoutRef.current);
      mediaRotateTimeoutRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      mediaStopReasonRef.current = "finalize";
      recorder.stop();
    }

    const deadline = Date.now() + 5000;
    while (mediaUploadInFlightRef.current > 0 && Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }

    try {
      await interviewSessionAPI.finalizeMedia(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not finalize interview media.";
      setMediaWarning(message);
      logWithCooldown("media_finalize_failed", { message });
    }
  };

  const handleRun = async () => {
    if (!selectedProblemId) {
      return;
    }
    if (!code.trim()) {
      toast({
        title: "Empty solution",
        description: "Please write your solution before running.",
        variant: "destructive",
      });
      return;
    }
    const mismatch = detectLanguageMismatch(language, code);
    if (mismatch) {
      toast({
        title: "Language mismatch",
        description: `${mismatch} Please switch the language and try again.`,
        variant: "destructive",
      });
      return;
    }
    setExecutionResult(null);
    setActiveCaseIndex(0);
    setRunOutput("Running tests...");
    await runMutation.mutateAsync();
  };

  useEffect(() => {
    if (!token || session?.status !== "started") {
      return;
    }

    const MediaRecorderImpl = (window as MediaRecorderWindow).MediaRecorder;
    if (!navigator.mediaDevices?.getUserMedia || !MediaRecorderImpl) {
      setCameraState("warning");
      setMicrophoneState("warning");
      setMediaWarning("This browser does not support interview recording.");
      logWithCooldown("media_unsupported", { user_agent: navigator.userAgent });
      return;
    }

    let cancelled = false;

    const uploadChunk = async (blob: Blob, startedAt: Date, endedAt: Date) => {
      if (!blob.size || cancelled) {
        return;
      }

      const sequenceNumber = mediaSequenceRef.current;
      mediaSequenceRef.current += 1;
      mediaUploadInFlightRef.current += 1;

      try {
        await uploadMediaMutation.mutateAsync({
          token,
          media_kind: "combined",
          sequence_number: sequenceNumber,
          mime_type: blob.type || "video/webm",
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          duration_ms: endedAt.getTime() - startedAt.getTime(),
          file: blob,
          filename: `segment-${sequenceNumber}.webm`,
        });
        setMediaWarning(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Media upload failed.";
        setCameraState("warning");
        setMicrophoneState("warning");
        setMediaWarning(message);
        logWithCooldown("media_upload_failed", { sequence_number: sequenceNumber, message });
      } finally {
        mediaUploadInFlightRef.current = Math.max(0, mediaUploadInFlightRef.current - 1);
      }
    };

    const segmentDurationMs = 10000;

    const scheduleRotation = () => {
      if (mediaRotateTimeoutRef.current) {
        window.clearTimeout(mediaRotateTimeoutRef.current);
      }
      mediaRotateTimeoutRef.current = window.setTimeout(() => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state !== "recording") {
          return;
        }
        mediaStopReasonRef.current = "rotate";
        recorder.stop();
      }, segmentDurationMs);
    };

    const createRecorder = (stream: MediaStream) => {
      const preferredMimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mimeType =
        preferredMimeTypes.find((candidate) => MediaRecorderImpl.isTypeSupported(candidate)) ?? "";
      const recorder = mimeType ? new MediaRecorderImpl(stream, { mimeType }) : new MediaRecorderImpl(stream);
      mediaRecorderRef.current = recorder;

      const segmentStartedAt = new Date();

      recorder.addEventListener("dataavailable", (event) => {
        if (!event.data || event.data.size === 0) {
          return;
        }
        const segmentEndedAt = new Date();
        void uploadChunk(event.data, segmentStartedAt, segmentEndedAt);
      });

      recorder.addEventListener("stop", () => {
        const stopReason = mediaStopReasonRef.current;
        mediaRecorderRef.current = null;

        if (cancelled || stopReason === "cleanup" || stopReason === "finalize") {
          mediaStopReasonRef.current = "idle";
          return;
        }

        if (stopReason === "rotate" && session?.status === "started") {
          mediaStopReasonRef.current = "idle";
          createRecorder(stream);
          return;
        }

        mediaStopReasonRef.current = "idle";
        if (session?.status === "started") {
          setCameraState("warning");
          setMicrophoneState("warning");
          setMediaWarning("Interview recording stopped before the session ended.");
          logWithCooldown("media_capture_stopped");
        }
      });

      recorder.start();
      scheduleRotation();
    };

    const startCapture = async () => {
      setCameraState("starting");
      setMicrophoneState("starting");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (mediaPreviewRef.current) {
          mediaPreviewRef.current.srcObject = stream;
        }

        setCameraState(stream.getVideoTracks().length > 0 ? "ready" : "warning");
        setMicrophoneState(stream.getAudioTracks().length > 0 ? "ready" : "warning");

        stream.getTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            if (cancelled) {
              return;
            }
            const state = track.kind === "video" ? setCameraState : setMicrophoneState;
            state("warning");
            setMediaWarning(`${track.kind === "video" ? "Camera" : "Microphone"} access stopped.`);
            logWithCooldown("media_track_ended", { kind: track.kind });
          });
        });

        createRecorder(stream);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Camera or microphone access failed.";
        setCameraState("blocked");
        setMicrophoneState("blocked");
        setMediaWarning(message);
        logWithCooldown("media_permission_denied", { message });
      }
    };

    void startCapture();

    return () => {
      cancelled = true;
      if (mediaRotateTimeoutRef.current) {
        window.clearTimeout(mediaRotateTimeoutRef.current);
        mediaRotateTimeoutRef.current = null;
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        mediaStopReasonRef.current = "cleanup";
        recorder.stop();
      }
      mediaRecorderRef.current = null;
      if (mediaPreviewRef.current) {
        mediaPreviewRef.current.srcObject = null;
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };
  }, [session?.status, token]);

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
  const sampleCases = useMemo(
    () => (currentProblemQuery.data?.test_cases ?? []).filter((testCase) => testCase.is_sample).sort((a, b) => a.order - b.order),
    [currentProblemQuery.data?.test_cases],
  );

  useEffect(() => {
    if (runCases.length === 0) {
      return;
    }
    if (activeCaseIndex >= runCases.length) {
      setActiveCaseIndex(0);
    }
  }, [activeCaseIndex, runCases.length]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (dragRef.current === "vertical") {
        const rect = splitRef.current?.getBoundingClientRect();
        if (!rect) return;
        const next = ((event.clientX - rect.left) / rect.width) * 100;
        const clamped = Math.min(52, Math.max(24, next));
        setLeftWidth(clamped);
        return;
      }

      if (dragRef.current === "right-horizontal") {
        const rect = rightPanelRef.current?.getBoundingClientRect();
        if (!rect) return;
        const next = ((rect.bottom - event.clientY) / rect.height) * 100;
        const clamped = Math.min(72, Math.max(22, next));
        setRightResultsHeight(clamped);
      }
    };

    const handleMouseUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (!token) {
    return <Redirect to="/challenge" />;
  }

  if (sessionQuery.isLoading || !session) {
    return (
      <div className="space-y-4 py-10">
        <div className="flex justify-end px-4">
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading active session...
        </div>
      </div>
    );
  }

  if (session.status !== "started") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
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
    <div className="h-screen overflow-hidden bg-slate-50 font-body text-slate-900 dark:bg-[#060e20] dark:text-[#dee5ff]">
      <main className="flex h-screen overflow-hidden">
        <aside className="flex w-24 shrink-0 flex-col border-r border-slate-200 bg-slate-100 dark:border-white/5 dark:bg-[#091328]">
          <div className="border-b border-slate-200 px-3 py-4 text-center dark:border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-[#a3aac4]">Time</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Timer className="h-4 w-4 animate-pulse text-amber-500 dark:text-[#ffb148]" />
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-[#dee5ff]">{timeLeft ?? "--:--"}</span>
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-4">
            <div className="space-y-3">
              {[...session.problems]
                .sort((a, b) => a.order - b.order)
                .map((problem, index) => {
                  const active = selectedProblemId === problem.id;
                  return (
                    <button
                      key={problem.id}
                      type="button"
                      onClick={() => handleProblemChange(problem.id)}
                      className={`w-full rounded-2xl border p-3 text-center transition-all ${
                        active
                          ? "border-emerald-400 bg-emerald-50 shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:border-[#69f6b8] dark:bg-[#1b2744] dark:shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                          : "border-slate-200 bg-white hover:bg-slate-100 dark:border-white/5 dark:bg-[#141f38] dark:hover:bg-[#1b2744]"
                      }`}
                    >
                      <div className={`text-xs font-black uppercase tracking-[0.24em] ${active ? "text-emerald-600 dark:text-[#69f6b8]" : "text-slate-500 dark:text-[#a3aac4]"}`}>
                        P{index + 1}
                      </div>
                      <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 dark:text-[#dee5ff]/70">
                        {problem.difficulty}
                      </div>
                    </button>
                  );
                })}
            </div>
          </ScrollArea>

          <div className="mt-auto border-t border-slate-200 bg-slate-100/80 p-3 dark:border-white/5 dark:bg-black/10">
            <div className="mb-3 flex items-center justify-center">
              <ThemeToggle />
            </div>
            <div className="mb-3 flex flex-col items-center gap-2">
              <div className="relative">
                <div className="flex h-20 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-white dark:border-[#40485d] dark:bg-[#192540]">
                  {cameraState === "ready" ? (
                    <video ref={mediaPreviewRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    <Camera className={`h-4 w-4 ${getMediaTone(cameraState)}`} />
                  )}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-100 dark:border-[#091328] ${
                    cameraState === "ready"
                      ? "bg-emerald-500 dark:bg-[#69f6b8]"
                      : cameraState === "blocked"
                        ? "bg-rose-500 dark:bg-rose-400"
                        : cameraState === "warning"
                          ? "bg-amber-500 dark:bg-amber-300"
                          : "bg-slate-300 dark:bg-[#a3aac4]"
                  }`}
                />
              </div>
              <p className="text-center text-[10px] font-bold leading-4 text-slate-700 dark:text-[#dee5ff]">
                {cameraState === "ready" && microphoneState === "ready" ? "Recording live" : "Monitoring status"}
              </p>
              <div className="flex gap-1">
                <span className={`h-1 w-4 rounded-full ${cameraState === "ready" ? "bg-emerald-500 dark:bg-[#69f6b8]" : "bg-slate-300 dark:bg-[#a3aac4]/40"}`} />
                <span className={`h-1 w-6 rounded-full ${microphoneState === "ready" ? "bg-emerald-500 dark:bg-[#69f6b8]" : "bg-slate-300 dark:bg-[#a3aac4]/40"}`} />
                <span className={`h-1 w-3 rounded-full ${uploadedSegments > 0 ? "bg-emerald-300 dark:bg-[#69f6b8]/40" : "bg-slate-300 dark:bg-[#a3aac4]/30"}`} />
              </div>
              <p className="text-center text-[10px] font-medium text-slate-500 dark:text-[#a3aac4]">
                {uploadedSegments} uploaded
                {typeof mediaStatusQuery.data?.latest_sequence_number === "number"
                  ? ` · latest #${mediaStatusQuery.data.latest_sequence_number}`
                  : ""}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-center gap-2 rounded-lg bg-white p-2 dark:bg-[#141f38]">
                <Mic className={`h-4 w-4 ${getMediaTone(microphoneState)}`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-[#a3aac4]">
                  Mic {getMediaLabel(microphoneState)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-lg bg-white p-2 dark:bg-[#141f38]">
                <Camera className={`h-4 w-4 ${getMediaTone(cameraState)}`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-[#a3aac4]">
                  Cam {getMediaLabel(cameraState)}
                </span>
              </div>
            </div>
            {mediaWarning && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                {mediaWarning}
              </div>
            )}
          </div>
        </aside>

        <section ref={splitRef} className="flex min-w-0 flex-1 overflow-hidden">
          <div
            className="flex min-h-0 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950"
            style={{ width: `${leftWidth}%` }}
          >
            <div className="border-b border-slate-200 bg-slate-100 px-5 py-3 dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-headline text-xl font-bold text-slate-900 dark:text-slate-100">{currentProblemMeta?.title ?? "Problem"}</h2>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                    {currentProblemMeta?.difficulty ?? "Interview Problem"}
                  </p>
                </div>
                {currentProblemMeta?.difficulty && (
                  <Badge variant="outline" className="border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                    {currentProblemMeta.difficulty}
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-8 p-6">
                <div className="space-y-4">
                  <div className="whitespace-pre-wrap rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm leading-8 text-slate-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100">
                    {currentProblemQuery.data?.description || currentProblemMeta?.description || "Review the prompt and write your solution."}
                  </div>
                </div>

                {sampleCases.length > 0 && (
                  <div className="space-y-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Examples</div>
                    {sampleCases.map((testCase, index) => (
                      <div key={testCase.id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">Example {index + 1}</div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Input</p>
                          <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
                            {testCase.input_text}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Output</p>
                          <pre className="mt-2 overflow-x-auto rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-mono text-xs text-emerald-700 dark:border-[#69f6b8]/20 dark:bg-[#69f6b8]/10 dark:text-[#69f6b8]">
                            {testCase.output_text}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentProblemQuery.data?.constraints && (
                  <div className="space-y-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Constraints</div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-8 text-slate-700 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
                      {currentProblemQuery.data.constraints}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div
            className="flex h-full w-3 shrink-0 cursor-col-resize items-center justify-center bg-slate-100 dark:bg-[#060e20]"
            onMouseDown={() => {
              dragRef.current = "vertical";
              document.body.style.userSelect = "none";
              document.body.style.cursor = "col-resize";
            }}
          >
            <div className="h-full w-px bg-slate-300 dark:bg-white/10" />
          </div>

          <section ref={rightPanelRef} className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-100 dark:bg-[#060e20]">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-white/5 dark:bg-[#141f38]">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sky-600 dark:text-[#7aafff]">
                  <span className="font-mono text-xs font-medium">Solution.{getLanguageFileExtension(language)}</span>
                </div>
                <div className="h-4 w-px bg-slate-300 dark:bg-[#40485d]" />
                <div className="text-xs font-mono text-slate-500 dark:text-[#a3aac4]">{getLanguageLabel(language)}</div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-9 w-[160px] border-slate-300 bg-slate-50 text-xs font-bold uppercase tracking-[0.16em] text-slate-900 dark:border-white/10 dark:bg-[#192540] dark:text-[#dee5ff]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {starterLanguages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {getLanguageLabel(lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  className="h-9 rounded-md bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-[#192540] dark:text-[#dee5ff] dark:hover:bg-[#243353]"
                  onClick={() => {
                    const starter =
                      currentProblemQuery.data?.starter_codes?.find((starter) => starter.language.toLowerCase() === language)?.code ??
                      defaultStarter[language as keyof typeof defaultStarter] ??
                      "";
                    setCode(starter);
                    setIsDirty(true);
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  className="h-9 rounded-md bg-emerald-400 px-4 text-xs font-bold text-emerald-950 hover:bg-emerald-300 dark:bg-[#69f6b8] dark:text-[#005a3c] dark:hover:bg-[#58e7ab]"
                  onClick={handleRun}
                  disabled={!selectedProblemId || runMutation.isPending}
                >
                  {runMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Run Tests
                </Button>
              </div>
            </div>

            <div className="min-h-0 shrink-0 overflow-hidden" style={{ height: `${100 - rightResultsHeight}%` }}>
              <CodeEditor
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setIsDirty(true);
                }}
                language={language as "javascript" | "python" | "java" | "cpp" | "algo"}
                height="100%"
                showHeader={false}
                fileName={`Solution.${getLanguageFileExtension(language)}`}
              />
            </div>

            <div
              className="flex h-3 shrink-0 cursor-row-resize items-center justify-center bg-slate-100 dark:bg-[#060e20]"
              onMouseDown={() => {
                dragRef.current = "right-horizontal";
                document.body.style.userSelect = "none";
                document.body.style.cursor = "row-resize";
              }}
            >
              <div className="h-px w-full bg-slate-300 dark:bg-white/10" />
            </div>

            <div
              className="flex min-h-0 shrink-0 flex-col overflow-hidden border-t border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-[#091328]"
              style={{ height: `${rightResultsHeight}%` }}
            >
              <div className="flex h-8 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-white/5 dark:bg-[#141f38]">
                <span className="border-b-2 border-emerald-500 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:border-[#69f6b8] dark:text-[#69f6b8]">Test Results</span>
                <span className="text-xs text-slate-500 dark:text-[#a3aac4]">{executionResult ? `${executionResult.passed}/${executionResult.total} passed` : "Waiting for run"}</span>
              </div>

              <ScrollArea className="h-0 min-h-0 flex-1">
                <div className="space-y-3 p-4 pb-10 font-mono text-xs">
                  {runCases.length > 0 ? (
                    <>
                      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${getVerdictStyle(executionResult?.verdict ?? "NA")}`}>
                        <div className="flex items-center gap-2 font-semibold">
                          {getVerdictIcon(executionResult?.verdict ?? "NA")}
                          <span>{executionResult?.verdict ?? "NA"}</span>
                        </div>
                        <div>{executionResult?.passed ?? 0}/{executionResult?.total ?? 0} passed</div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {runCases.map((tc, index) => (
                          <button
                            key={tc.id ?? index}
                            type="button"
                            onClick={() => setActiveCaseIndex(index)}
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${
                              activeCaseIndex === index
                                ? tc.passed
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-[#69f6b8]/30 dark:bg-[#006c49] dark:text-[#e1ffec]"
                                  : "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-[#141f38] dark:text-[#a3aac4] dark:hover:bg-[#192540]"
                            }`}
                          >
                            Case {index + 1}
                          </button>
                        ))}
                      </div>

                      {activeRunCase && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-900 dark:border-white/5 dark:bg-black/10 dark:text-[#dee5ff]">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-[#a3aac4]">
                              Test Case {activeCaseIndex + 1}
                            </span>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                activeRunCase.passed ? "bg-[#006c49] text-[#e1ffec]" : "bg-rose-900/40 text-rose-200"
                              }`}
                            >
                              {activeRunCase.passed ? "Passed" : "Failed"}
                            </span>
                          </div>
                          {activeRunCase.status && <p className="mb-2 text-slate-500 dark:text-[#a3aac4]">Status: {activeRunCase.status}</p>}
                          <p className="text-slate-500 dark:text-[#a3aac4]">Input:</p>
                          <pre className="mb-3 mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/5 dark:bg-[#141f38]">
                            {activeRunCase.input_text ?? ""}
                          </pre>
                          <p className="text-slate-500 dark:text-[#a3aac4]">Expected:</p>
                          <pre className="mb-3 mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/5 dark:bg-[#141f38]">
                            {activeRunCase.output_text ?? ""}
                          </pre>
                          <p className="text-slate-500 dark:text-[#a3aac4]">Your Output:</p>
                          <pre className="mb-3 mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/5 dark:bg-[#141f38]">
                            {formatOutput(activeRunCase.stdout)}
                          </pre>
                          {(activeRunCase.stderr || activeRunCase.compile_output) && (
                            <>
                              <p className="text-rose-300">Error:</p>
                              <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-rose-900/40 bg-rose-950/30 p-2 text-rose-200">
                                {formatOutput(activeRunCase.stderr || activeRunCase.compile_output)}
                              </pre>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-slate-500 dark:text-[#a3aac4]">{runOutput ?? "Run your code to see test results."}</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </section>

          <aside className="flex flex-col items-center gap-5 border-l border-slate-200 bg-slate-100 py-4 dark:border-white/5 dark:bg-[#091328]">
            <Button
              variant="destructive"
              className="h-10 w-10 rounded-lg bg-rose-700 p-0 hover:bg-rose-600"
              title="Finish interview"
              aria-label="Finish interview"
              onClick={async () => {
                if (!window.confirm("Finish the interview now?")) return;
                loggingEnabledRef.current = false;
                await persistInterviewDrafts();
                await finalizeMediaUploads();
                await submitMutation.mutateAsync();
              }}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            <div className="mt-auto flex flex-col items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)] dark:bg-[#69f6b8] dark:shadow-[0_0_8px_rgba(105,246,184,0.5)]" />
              <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-[#a3aac4]">
                Connected
              </span>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default InterviewSessionPage;
