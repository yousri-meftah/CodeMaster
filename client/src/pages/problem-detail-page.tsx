import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Problem } from "@shared/schema";
import CodeEditor from "@/components/CodeEditor";
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Play, UploadCloud, Terminal, FileText, Activity, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
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

const ProblemDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const problemId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [activeTab, setActiveTab] = useState("description");
  const [lastStarter, setLastStarter] = useState("");
  const [hasUserEdits, setHasUserEdits] = useState(false);
  const [executionResult, setExecutionResult] = useState<SubmissionResult | null>(null);
  const [executionMode, setExecutionMode] = useState<"run" | "submit" | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [leftWidth, setLeftWidth] = useState(50);
  const [leftOutputHeight, setLeftOutputHeight] = useState(50);
  const [isLargeLayout, setIsLargeLayout] = useState(false);
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const splitRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"vertical" | "left-horizontal" | null>(null);

  const { data: problem, isLoading: problemLoading } = useQuery<ProblemDetail>({
    queryKey: ["problem", problemId],
    queryFn: () => problemsAPI.getProblemById(id),
    enabled: !isNaN(problemId),
  });

  const { data: savedSolution } = useQuery({
    queryKey: ["solution", problemId],
    queryFn: () => problemsAPI.getSolutionByProblem(problemId),
    enabled: !!user && !isNaN(problemId),
  });

  useEffect(() => {
    if (savedSolution?.code) {
      setCode(savedSolution.code);
      setHasUserEdits(true);
    }
  }, [savedSolution]);

  const handleRun = async () => {
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
        language,
        code,
      });
      setExecutionResult(result);
      setActiveCaseIndex(0); // Reset to first test case
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
        language,
        code,
      });
      setExecutionResult(result);
      setActiveCaseIndex(0); // Reset to first test case
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
    () => (problem?.test_cases ?? []).filter(tc => tc.is_sample).sort((a, b) => a.order - b.order),
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

  // Handle starter code loading
  useEffect(() => {
    if (!problem) return;
    if (savedSolution?.code) return;
    const starter = starterCodeMap.get(language.toLowerCase()) ?? "";
    if (!starter) return;
    const shouldReplace = !hasUserEdits || code.trim() === "" || code === lastStarter;
    if (shouldReplace) {
      setCode(starter);
      setLastStarter(starter);
      setHasUserEdits(false);
    }
  }, [problem, language, starterCodeMap, savedSolution, hasUserEdits, code, lastStarter]);

  // Validate active case index
  useEffect(() => {
    if (runCases.length === 0) return;
    if (activeCaseIndex >= runCases.length) {
      setActiveCaseIndex(0);
    }
  }, [runCases.length, activeCaseIndex]);

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
    const handleLeftResize = (event: MouseEvent) => {
      if (dragRef.current !== "left-horizontal") return;
      const rect = leftPanelRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = ((event.clientY - rect.top) / rect.height) * 100;
      const clamped = Math.min(60, Math.max(20, next));
      setLeftOutputHeight(100 - clamped);
    };

    const handleMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousemove", handleLeftResize);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      mediaQuery.removeEventListener("change", updateLayout);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousemove", handleLeftResize);
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

  const executionStatus = isExecuting
    ? executionMode === "submit"
      ? "Submitting..."
      : "Running..."
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-sky-50/40">
      <div className="space-y-4 px-4 py-4 lg:px-6 lg:py-6">
      {/* Header */}
      <Card className="border-2 bg-card">
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getDifficultyColor(problem.difficulty)}>
                  {problem.difficulty}
                </Badge>
                <span className="text-sm text-muted-foreground">#{problem.id}</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{problem.title}</h1>
              {headerTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {headerTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="capitalize text-xs">
                      {tag.replace(/-/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {problem.external_link && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={problem.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Reference
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Split View */}
      <div
        ref={splitRef}
        className="flex flex-col lg:flex-row gap-0 rounded-xl border-2 overflow-hidden bg-card lg:h-[calc(100vh-140px)] lg:min-h-[760px]"
      >
        {/* Left Panel - Problem Description */}
        <div
          ref={leftPanelRef}
          className="flex flex-col min-h-[600px] lg:min-h-0 h-full bg-card"
          style={{ width: isLargeLayout ? `${leftWidth}%` : "100%" }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="border-b bg-muted/30 px-4 py-2">
              <TabsList className="h-9">
                <TabsTrigger value="description" className="text-xs">Description</TabsTrigger>
                <TabsTrigger value="examples" className="text-xs">
                  Examples {sampleCases.length > 0 && `(${sampleCases.length})`}
                </TabsTrigger>
                <TabsTrigger value="constraints" className="text-xs">Constraints</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 lg:p-6">
                  <TabsContent value="description" className="mt-0">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {problem.description ? (
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {problem.description}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-center py-8">
                          No description available yet.
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="examples" className="mt-0">
                    <div className="space-y-4">
                      {sampleCases.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          No sample test cases available.
                        </div>
                      ) : (
                        sampleCases.map((tc, index) => (
                          <div key={tc.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                            <div className="text-xs font-semibold uppercase text-muted-foreground">
                              Example {index + 1}
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm">
                                <span className="font-semibold mb-1 block">Input:</span>
                                <pre className="font-mono text-xs bg-background border rounded-md p-3 overflow-x-auto">
                                  {tc.input_text}
                                </pre>
                              </div>
                              <div className="text-sm">
                                <span className="font-semibold mb-1 block">Output:</span>
                                <pre className="font-mono text-xs bg-background border rounded-md p-3 overflow-x-auto">
                                  {tc.output_text}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="constraints" className="mt-0">
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Constraints will be added later.
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>

              {isLargeLayout && (
                <div
                  className="hidden lg:flex h-3 cursor-row-resize items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    dragRef.current = "left-horizontal";
                    document.body.style.userSelect = "none";
                    document.body.style.cursor = "row-resize";
                  }}
                >
                  <div className="h-0.5 w-24 bg-border" />
                </div>
              )}
              <div
                className="border-t bg-muted/20 flex flex-col"
                style={{ height: `${leftOutputHeight}%` }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">
                      {executionMode === "submit" ? "Submission" : "Test"} Results
                    </span>
                  </div>
                  {executionResult && (
                    <Badge variant="outline" className="text-xs">
                      {executionResult.passed}/{executionResult.total} passed
                    </Badge>
                  )}
                </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4">
                    {!executionResult ? (
                      <div className="text-sm text-muted-foreground text-center py-6">
                        {isExecuting 
                          ? "Executing your code..." 
                          : "Run or submit your solution to see results"}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${getVerdictStyle(executionResult.verdict)}`}>
                          <div className="flex items-center gap-2 font-semibold">
                            {getVerdictIcon(executionResult.verdict)}
                            <span>{executionResult.verdict}</span>
                          </div>
                          <div className="text-sm">
                            {executionResult.passed}/{executionResult.total} passed
                          </div>
                        </div>

                        {executionResult.hidden && (
                          <div className="text-xs text-muted-foreground px-1">
                            Hidden tests: {executionResult.hidden.passed}/{executionResult.hidden.total} passed
                          </div>
                        )}

                        {runCases.length > 0 && (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {runCases.map((tc, index) => (
                                <button
                                  key={tc.id ?? index}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                                    index === activeCaseIndex
                                      ? tc.passed
                                        ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                                      : "bg-background border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => setActiveCaseIndex(index)}
                                  type="button"
                                >
                                  <div className="flex items-center gap-1.5">
                                    {tc.passed ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    Test {index + 1}
                                  </div>
                                </button>
                              ))}
                            </div>

                            {activeRunCase && (
                              <div className="rounded-lg border bg-card p-4 space-y-3">
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
                                    <pre className="text-xs font-mono whitespace-pre-wrap rounded-md border bg-muted/50 p-2 overflow-x-auto">
                                      {activeRunCase.input_text}
                                    </pre>
                                  </div>
                                )}

                                {activeRunCase.output_text && (
                                  <div className="space-y-1">
                                    <span className="text-xs font-semibold">Expected:</span>
                                    <pre className="text-xs font-mono whitespace-pre-wrap rounded-md border bg-muted/50 p-2 overflow-x-auto">
                                      {activeRunCase.output_text}
                                    </pre>
                                  </div>
                                )}

                                <div className="space-y-1">
                                  <span className="text-xs font-semibold">Your Output:</span>
                                  <pre className={`text-xs font-mono whitespace-pre-wrap rounded-md border p-2 overflow-x-auto ${
                                    activeRunCase.passed ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30"
                                  }`}>
                                    {activeRunCase.stdout || "(no output)"}
                                  </pre>
                                </div>

                                {(activeRunCase.stderr || activeRunCase.compile_output) && (
                                  <div className="space-y-1">
                                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                                      Errors:
                                    </span>
                                    <pre className="text-xs font-mono whitespace-pre-wrap rounded-md border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-2 text-rose-700 dark:text-rose-300 overflow-x-auto">
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
                </ScrollArea>
              </div>
            </div>
          </Tabs>
        </div>

        {/* Resize Handle */}
        {isLargeLayout && (
          <div
            className="hidden lg:flex w-4 cursor-col-resize items-center justify-center hover:bg-primary/10 transition-colors group relative"
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
          className="flex flex-col min-h-[650px] lg:min-h-0 h-full bg-card"
          style={{ width: isLargeLayout ? `${100 - leftWidth}%` : "100%" }}
        >
          <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Terminal className="h-4 w-4 text-primary" />
              <span>Code</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRun} 
                disabled={isExecuting}
                className="h-8 px-3 gap-2"
              >
                {isExecuting && executionMode === "run" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                Run
              </Button>
              <Button 
                size="sm"
                onClick={handleSubmit} 
                disabled={isExecuting}
                className="h-8 px-3 gap-2"
              >
                {isExecuting && executionMode === "submit" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <UploadCloud className="h-3 w-3" />
                )}
                Submit
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden min-h-[700px]">
            <CodeEditor
              value={code}
              onChange={(value) => {
                setCode(value);
                if (value !== lastStarter) {
                  setHasUserEdits(true);
                }
              }}
              height="100%"
              language={language as "javascript" | "python" | "java" | "cpp"}
            />
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ProblemDetailPage;
