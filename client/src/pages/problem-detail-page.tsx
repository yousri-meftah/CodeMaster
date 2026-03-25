import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Problem } from "@/types/schema";
import CodeEditor from "@/components/CodeEditor";
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Play, UploadCloud, Terminal, Activity, CheckCircle2, XCircle, Clock, AlertCircle, ArrowLeft, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { problemsAPI, submissionsAPI, SubmissionResult } from "@/services/api";

type ProblemTestCase = {
  id: number;
  input_text: string;
  output_text: string;
  is_sample: boolean;
  order: number;
};

type ProblemDetail = Problem & {
  description?: string | null;
  test_cases?: ProblemTestCase[];
  starter_codes?: ProblemStarterCode[];
};

type ProblemStarterCode = {
  id: number;
  language: string;
  code: string;
};

const getStoredPreferredLanguage = (problemId: number) => {
  if (typeof window === "undefined" || Number.isNaN(problemId)) {
    return "javascript";
  }

  return (
    localStorage.getItem(`problem:${problemId}:preferredLanguage`) ||
    localStorage.getItem("preferredLanguage") ||
    "javascript"
  );
};

const ProblemDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const problemId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState(() => getStoredPreferredLanguage(problemId));
  const [activeTab, setActiveTab] = useState("description");
  const [lastStarter, setLastStarter] = useState("");
  const [hasUserEdits, setHasUserEdits] = useState(false);
  const [executionResult, setExecutionResult] = useState<SubmissionResult | null>(null);
  const [executionMode, setExecutionMode] = useState<"run" | "submit" | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastSavedCode, setLastSavedCode] = useState("");
  const [leftWidth, setLeftWidth] = useState(50);
  const [rightResultsHeight, setRightResultsHeight] = useState(35);
  const [isLargeLayout, setIsLargeLayout] = useState(false);
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"vertical" | "right-horizontal" | null>(null);

  const { data: problem, isLoading: problemLoading } = useQuery<ProblemDetail>({
    queryKey: ["problem", problemId],
    queryFn: () => problemsAPI.getProblemById(id),
    enabled: !isNaN(problemId),
  });

  useEffect(() => {
    setLanguage(getStoredPreferredLanguage(problemId));
    setIsEditorReady(false);
    setCode("");
    setLastStarter("");
    setHasUserEdits(false);
  }, [problemId]);

  const {
    data: submissions,
    refetch: refetchSubmissions,
  } = useQuery({
    queryKey: ["problem-submissions", problemId],
    queryFn: () => submissionsAPI.getByProblem(problemId),
    enabled: !!user && !isNaN(problemId),
  });

  const handleRun = async () => {
    if (!isEditorReady) {
      toast({
        title: "Editor still loading",
        description: "Wait a moment for the selected language code to load, then run again.",
        variant: "destructive",
      });
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
    try {
      setIsExecuting(true);
      setExecutionMode("run");
      setExecutionResult(null); // Clear previous results
      const result = await submissionsAPI.run({
        problem_id: problemId,
        language: language.toLowerCase(),
        code,
      });
      setExecutionResult(result);
      setActiveCaseIndex(0); // Reset to first test case
      setShowCelebration(false);
      setShowSuccessModal(false);
      toast({
        title: result.verdict === "AC" ? "All tests passed!" : "Run completed",
        description: `Verdict: ${result.verdict} (${result.passed}/${result.total} passed)`,
        variant: result.verdict === "AC" ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Run failed",
        description: error?.response?.data?.detail ?? "Unable to run your code.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async () => {
    if (!isEditorReady) {
      toast({
        title: "Editor still loading",
        description: "Wait a moment for the selected language code to load, then submit again.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit your solution.",
        variant: "destructive",
      });
      return;
    }
    if (!code.trim()) {
      toast({
        title: "Empty solution",
        description: "Please write your solution before submitting.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsExecuting(true);
      setExecutionMode("submit");
      setExecutionResult(null); // Clear previous results
      const result = await submissionsAPI.submit({
        problem_id: problemId,
        language: language.toLowerCase(),
        code,
      });
      setExecutionResult(result);
      setActiveCaseIndex(0); // Reset to first test case
      if (result.verdict === "AC") {
        setShowCelebration(true);
        setShowSuccessModal(true);
      }
      await refetchSubmissions();
      toast({
        title: result.verdict === "AC" ? "Accepted! 🎉" : "Submission completed",
        description: `Verdict: ${result.verdict} (${result.passed}/${result.total} passed)`,
        variant: result.verdict === "AC" ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error?.response?.data?.detail ?? "Unable to submit your code.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const headerTags = useMemo(() => problem?.tags ?? [], [problem?.tags]);
  const sampleCases = useMemo(
    () => (problem?.test_cases ?? []).filter((tc) => tc.is_sample).sort((a, b) => a.order - b.order),
    [problem?.test_cases]
  );
  const runCases = executionResult?.cases ?? [];
  const activeRunCase = runCases[activeCaseIndex];
  const starterCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    (problem?.starter_codes ?? []).forEach((starter) => {
      map.set(starter.language.toLowerCase(), starter.code);
    });
    return map;
  }, [problem?.starter_codes]);

  const submissionStatus = useMemo(() => {
    if (!submissions || submissions.length === 0) return "none";
    const hasAccepted = submissions.some((s: any) => (s.verdict || "").toUpperCase() === "AC");
    if (hasAccepted) return "solved";
    return "tried";
  }, [submissions]);

  const inferredConstraints = useMemo(() => {
    if (problem?.constraints && problem.constraints.trim()) {
      return problem.constraints
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }

    return sampleCases.length > 0
      ? [
          `${sampleCases.length} sample test case${sampleCases.length === 1 ? "" : "s"} available`,
          "Use the selected language runtime for execution",
        ]
      : [];
  }, [problem?.constraints, sampleCases.length]);

  // Handle starter code + local storage per language
  useEffect(() => {
    if (!problem || Number.isNaN(problemId)) return;
    const key = `problem:${problemId}:lang:${language.toLowerCase()}`;
    setIsEditorReady(false);
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      setCode(stored);
      setLastStarter(stored);
      setHasUserEdits(true);
      setIsEditorReady(true);
      return;
    }

    const starter = starterCodeMap.get(language.toLowerCase()) ?? "";
    setCode(starter);
    setLastStarter(starter);
    setHasUserEdits(false);
    localStorage.setItem(key, starter);
    setIsEditorReady(true);
  }, [problem, problemId, language, starterCodeMap]);

  // Debounced localStorage save (protects against navigation before blur)
  useEffect(() => {
    if (Number.isNaN(problemId)) return;
    const key = `problem:${problemId}:lang:${language.toLowerCase()}`;
    const timeout = setTimeout(() => {
      if (code !== lastSavedCode) {
        localStorage.setItem(key, code ?? "");
        setLastSavedCode(code ?? "");
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [code, language, problemId, lastSavedCode]);

  // Validate active case index
  useEffect(() => {
    if (runCases.length === 0) return;
    if (activeCaseIndex >= runCases.length) {
      setActiveCaseIndex(0);
    }
  }, [runCases.length, activeCaseIndex]);

  useEffect(() => {
    if (!showCelebration) return;
    const timer = setTimeout(() => setShowCelebration(false), 2200);
    return () => clearTimeout(timer);
  }, [showCelebration]);

  // Handle responsive layout and dragging
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateLayout = () => setIsLargeLayout(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragRef.current || dragRef.current !== "vertical") return;
      const rect = splitRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = ((event.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(70, Math.max(30, next));
      setLeftWidth(clamped);
    };
    const handleRightResize = (event: MouseEvent) => {
      if (dragRef.current !== "right-horizontal") return;
      const rect = rightPanelRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = ((rect.bottom - event.clientY) / rect.height) * 100;
      const clamped = Math.min(80, Math.max(18, next));
      setRightResultsHeight(clamped);
    };
    const handleMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousemove", handleRightResize);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      mediaQuery.removeEventListener("change", updateLayout);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousemove", handleRightResize);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (problemLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading problem...</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">Problem Not Found</h2>
          <p className="text-muted-foreground">
            The problem you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild className="mt-4">
            <a href="/problems">Back to Problems</a>
          </Button>
        </div>
      </div>
    );
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
      case "medium":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
      case "hard":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
    }
  }

  function getVerdictStyle(verdict: string) {
    const normalized = verdict?.toUpperCase?.() ?? "NA";
    switch (normalized) {
      case "AC":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
      case "WA":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
      case "TLE":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800";
      case "CE":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800";
      case "RE":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800";
      case "IE":
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/50 dark:text-slate-300 dark:border-slate-800";
      default:
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800";
    }
  }

  function getVerdictIcon(verdict: string) {
    const normalized = verdict?.toUpperCase?.() ?? "NA";
    switch (normalized) {
      case "AC":
        return <CheckCircle2 className="h-4 w-4" />;
      case "WA":
        return <XCircle className="h-4 w-4" />;
      case "TLE":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  }

  function getCaseTone(passed: boolean) {
    return passed
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800";
  }

  function formatOutput(value?: string | null) {
    if (value === null || value === undefined || value === "") return "(no output)";
    if (value.trim() === "") return "(whitespace output)";
    return value;
  }

  const executionStatus = isExecuting
    ? executionMode === "submit"
      ? "Submitting..."
      : "Running..."
    : !isEditorReady
      ? "Loading editor..."
    : executionResult
      ? `${executionResult.verdict} (${executionResult.passed}/${executionResult.total})`
      : "Ready";

  const executionDot = isExecuting
    ? "bg-amber-400 animate-pulse"
    : executionResult?.verdict === "AC"
      ? "bg-emerald-500"
      : executionResult
        ? "bg-rose-500"
        : "bg-slate-400";

  return (
    <div className="h-[calc(100vh-4rem-1px)] max-h-[calc(100vh-4rem-1px)] overflow-hidden bg-background text-foreground dark:bg-[#0a0c10] dark:text-slate-200">
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="confetti confetti-a" />
          <div className="confetti confetti-b" />
          <div className="confetti confetti-c" />
          <div className="confetti confetti-d" />
          <div className="confetti confetti-e" />
          <div className="confetti confetti-f" />
        </div>
      )}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Good job! 🎉</h3>
                <p className="text-sm text-muted-foreground">You got Accepted.</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSuccessModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur dark:border-white/5 dark:bg-[#11141b]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-muted-foreground dark:text-slate-400"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-extrabold tracking-tight">{problem.id}. {problem.title}</h1>
                <Badge className={`${getDifficultyColor(problem.difficulty)} rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em]`}>
                  {problem.difficulty}
                </Badge>
                {submissionStatus !== "none" && (
                  <Badge
                    variant="secondary"
                    className={
                      submissionStatus === "solved"
                        ? "rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    }
                  >
                    {submissionStatus === "solved" ? "Solved" : "Tried"}
                  </Badge>
                )}
              </div>
              {headerTags.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {headerTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="capitalize text-[10px] tracking-wide">
                      {tag.replace(/-/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 hidden items-center gap-2 text-xs font-mono text-muted-foreground md:flex">
              <span className={`h-2 w-2 rounded-full ${executionDot}`} />
              {executionStatus}
            </div>
            {problem.external_link && (
              <Button variant="ghost" size="sm" asChild className="gap-2 text-xs">
                <a href={problem.external_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Reference
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRun}
              disabled={isExecuting || !isEditorReady}
              className="h-9 rounded-lg px-4 text-xs font-bold uppercase tracking-[0.18em] dark:border-white/10 dark:bg-white/0 dark:hover:bg-white/5"
            >
              {isExecuting && executionMode === "run" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-2 h-3.5 w-3.5" />}
              Run
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isExecuting || !isEditorReady}
              className="h-9 rounded-lg px-5 text-xs font-black uppercase tracking-[0.2em]"
            >
              {isExecuting && executionMode === "submit" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="mr-2 h-3.5 w-3.5" />}
              Submit
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground dark:text-slate-400">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Split View */}
      <div
        ref={splitRef}
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-b border-border/60 bg-card dark:border-white/5 dark:bg-[#0f131b] lg:flex-row"
      >
        {/* Left Panel - Problem Description */}
        <div
          className="flex min-h-0 flex-col overflow-hidden bg-card dark:bg-[#0d1117]"
          style={{ width: isLargeLayout ? `${leftWidth}%` : "100%" }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="border-b border-border/60 bg-muted/20 px-4 dark:border-white/5 dark:bg-[#11141b]">
              <TabsList className="h-12 w-full justify-start gap-1 rounded-none bg-transparent p-0">
                <TabsTrigger value="description" className="h-12 rounded-none border-b-2 border-transparent px-4 text-xs font-bold uppercase tracking-[0.15em] data-[state=active]:border-primary data-[state=active]:bg-transparent">Description</TabsTrigger>
                <TabsTrigger value="submissions" className="h-12 rounded-none border-b-2 border-transparent px-4 text-xs font-bold uppercase tracking-[0.15em] data-[state=active]:border-primary data-[state=active]:bg-transparent">Submissions</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-6 lg:p-8">
                  <TabsContent value="description" className="mt-0">
                    <div className="space-y-8">
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-8 prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 dark:prose-code:bg-white/5">
                        {problem.description ? (
                          <div className="whitespace-pre-wrap text-base leading-8 text-foreground/90 dark:text-slate-300">
                            {problem.description}
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-center py-8">
                            No description available yet.
                          </div>
                        )}
                      </div>

                      {sampleCases.length > 0 && (
                        <div className="space-y-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                            Examples
                          </div>
                          {sampleCases.map((tc, index) => (
                            <div key={tc.id} className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-5 dark:border-white/5 dark:bg-white/[0.03]">
                              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                                Example {index + 1}
                              </div>
                              <div className="space-y-2">
                                <div className="text-sm">
                                  <span className="mb-2 block font-semibold">Input:</span>
                                  <pre className="overflow-x-auto rounded-xl border border-border/60 bg-background/80 p-3 font-mono text-xs dark:border-white/5 dark:bg-black/20">
                                    {tc.input_text}
                                  </pre>
                                </div>
                                <div className="text-sm">
                                  <span className="mb-2 block font-semibold">Output:</span>
                                  <pre className="overflow-x-auto rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 font-mono text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    {tc.output_text}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {inferredConstraints.length > 0 && (
                        <div className="space-y-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                            Constraints
                          </div>
                          <div className="space-y-3">
                            {inferredConstraints.map((constraint, index) => (
                              <div
                                key={`${constraint}-${index}`}
                                className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 font-mono text-xs dark:border-white/5 dark:bg-white/[0.03]"
                              >
                                <span className="h-4 w-1 rounded-full bg-emerald-500/60" />
                                <span>{constraint}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="submissions" className="mt-0">
                    {!user ? (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        Please log in to see your submissions.
                      </div>
                    ) : submissions && submissions.length > 0 ? (
                      <div className="space-y-3">
                        {submissions.map((submission: any) => (
                          <div
                            key={submission.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 dark:border-white/5 dark:bg-white/[0.03]"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`px-2 py-1 rounded text-xs font-semibold ${getVerdictStyle(submission.verdict || "NA")}`}>
                                <span className="inline-flex items-center gap-1">
                                  {getVerdictIcon(submission.verdict || "NA")}
                                  {(submission.verdict || "NA").toUpperCase()}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {submission.passed ?? 0}/{submission.total ?? 0}
                              </div>
                              <div className="text-xs text-muted-foreground uppercase">
                                {submission.language}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {submission.created_at ? new Date(submission.created_at).toLocaleString() : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No submissions yet.
                      </div>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>

            </div>
          </Tabs>
        </div>

        {/* Resize Handle */}
        {isLargeLayout && (
          <div
            className="group relative hidden w-3 cursor-col-resize items-center justify-center transition-colors hover:bg-primary/10 lg:flex"
            onMouseDown={(event) => {
              event.preventDefault();
              dragRef.current = "vertical";
              document.body.style.userSelect = "none";
              document.body.style.cursor = "col-resize";
            }}
          >
            <div className="w-0.5 h-full bg-border group-hover:bg-primary transition-colors" />
          </div>
        )}

        {/* Right Panel - Code Editor */}
        <div
          ref={rightPanelRef}
          className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card dark:bg-[#0d1117]"
          style={{ width: isLargeLayout ? `${100 - leftWidth}%` : "100%" }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-2 dark:border-white/5 dark:bg-[#11141b]">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-[0.18em]">Code</span>
              <span className="hidden font-mono text-xs text-muted-foreground lg:inline">
                Solution.{language === "python" ? "py" : language === "javascript" ? "js" : language === "java" ? "java" : language === "cpp" ? "cpp" : "txt"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={language}
                onValueChange={(value) => {
                  setLanguage(value);
                  if (!Number.isNaN(problemId)) {
                    localStorage.setItem(`problem:${problemId}:preferredLanguage`, value);
                  }
                  localStorage.setItem("preferredLanguage", value);
                }}
              >
                <SelectTrigger className="h-9 w-[150px] rounded-lg text-xs font-bold dark:border-white/10 dark:bg-white/[0.03]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="algo">Algo</SelectItem>
                </SelectContent>
              </Select>
              <div className="hidden items-center gap-2 text-xs font-mono text-muted-foreground xl:flex">
                <span className={`h-2 w-2 rounded-full ${executionDot}`} />
                {executionStatus}
              </div>
            </div>
          </div>

          <div
            className="min-h-0 shrink-0 overflow-hidden bg-background dark:bg-[#0d1117]"
            style={{ height: `${100 - rightResultsHeight}%` }}
          >
            <CodeEditor
              value={code}
              onChange={(value) => {
                setCode(value);
                if (value !== lastStarter) {
                  setHasUserEdits(true);
                }
                if (!Number.isNaN(problemId)) {
                  const key = `problem:${problemId}:lang:${language.toLowerCase()}`;
                  localStorage.setItem(key, value ?? "");
                }
              }}
              height="100%"
              language={language as "javascript" | "python" | "java" | "cpp" | "algo"}
              showHeader={false}
              fileName={`Solution.${language === "python" ? "py" : language === "javascript" ? "js" : language === "java" ? "java" : language === "cpp" ? "cpp" : "txt"}`}
            />
          </div>
          {isLargeLayout && (
            <div
              className="group relative z-10 hidden h-3 shrink-0 cursor-row-resize items-center justify-center transition-colors hover:bg-primary/10 lg:flex"
              onMouseDown={(event) => {
                event.preventDefault();
                dragRef.current = "right-horizontal";
                document.body.style.userSelect = "none";
                document.body.style.cursor = "row-resize";
              }}
            >
              <div className="h-[2px] w-full bg-border transition-colors group-hover:bg-primary" />
            </div>
          )}
          <div
            className="flex min-h-[180px] shrink-0 flex-col overflow-hidden border-t border-border/60 bg-muted/10 dark:border-white/5 dark:bg-[#11141b]"
            style={{ height: `${rightResultsHeight}%` }}
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3 dark:border-white/5 dark:bg-[#11141b]">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-[0.18em]">
                  {executionMode === "submit" ? "Submission" : "Test"} Results
                </span>
              </div>
              {executionResult && (
                <Badge variant="outline" className="text-xs">
                  {executionResult.passed}/{executionResult.total} passed
                </Badge>
              )}
            </div>

            <div className="h-0 min-h-0 flex-1 overflow-y-auto">
              <div className="p-4 pb-16">
                {!executionResult ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    {isExecuting
                      ? "Executing your code..."
                      : "Run or submit your solution to see results"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${getVerdictStyle(executionResult.verdict)}`}>
                      <div className="flex items-center gap-2 font-semibold">
                        {getVerdictIcon(executionResult.verdict)}
                        <span>{executionResult.verdict}</span>
                      </div>
                      <div className="text-sm">
                        {executionResult.passed}/{executionResult.total} passed
                      </div>
                    </div>

                    {executionResult.hidden && (
                      <div className="px-1 text-xs text-muted-foreground">
                        Hidden tests: {executionResult.hidden.passed}/{executionResult.hidden.total} passed
                      </div>
                    )}

                    {runCases.length > 0 && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {runCases.map((tc, index) => (
                            <button
                              key={tc.id ?? index}
                              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
                                tc.passed
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "border-rose-300 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              } ${
                                index === activeCaseIndex
                                  ? "ring-2 ring-primary/40 ring-offset-2 dark:ring-primary/50"
                                  : "hover:ring-2 hover:ring-primary/30 hover:ring-offset-2"
                              }`}
                              onClick={() => setActiveCaseIndex(index)}
                              type="button"
                            >
                              <div className="flex items-center gap-1.5">
                                {tc.passed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                Test {index + 1}
                              </div>
                            </button>
                          ))}
                        </div>

                        {activeRunCase && (
                          <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 dark:border-white/5 dark:bg-black/10">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase text-muted-foreground">
                                Test Case {activeCaseIndex + 1}
                              </span>
                              <Badge className={`text-xs ${getCaseTone(activeRunCase.passed)}`}>
                                {activeRunCase.passed ? "Passed" : "Failed"}
                              </Badge>
                            </div>

                            {activeRunCase.status && (
                              <div className="text-xs text-muted-foreground">
                                Status: {activeRunCase.status}
                              </div>
                            )}

                            {activeRunCase.input_text && (
                              <div className="space-y-1">
                                <span className="text-xs font-semibold">Input:</span>
                                <pre className="overflow-x-auto rounded-md border bg-muted/50 p-2 font-mono text-xs whitespace-pre-wrap">
                                  {activeRunCase.input_text}
                                </pre>
                              </div>
                            )}

                            {activeRunCase.output_text && (
                              <div className="space-y-1">
                                <span className="text-xs font-semibold">Expected:</span>
                                <pre className="overflow-x-auto rounded-md border bg-muted/50 p-2 font-mono text-xs whitespace-pre-wrap">
                                  {activeRunCase.output_text}
                                </pre>
                              </div>
                            )}

                            <div className="space-y-1">
                              <span className="text-xs font-semibold">Your Output:</span>
                              <pre className={`overflow-x-auto rounded-md border p-2 font-mono text-xs whitespace-pre-wrap ${
                                activeRunCase.passed ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30"
                              }`}>
                                {formatOutput(activeRunCase.stdout)}
                              </pre>
                            </div>

                            {(activeRunCase.stderr || activeRunCase.compile_output) && (
                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                                  Errors:
                                </span>
                                <pre className="overflow-x-auto rounded-md border border-rose-200 bg-rose-50 p-2 font-mono text-xs text-rose-700 whitespace-pre-wrap dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                                  {activeRunCase.stderr || activeRunCase.compile_output}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ProblemDetailPage;
