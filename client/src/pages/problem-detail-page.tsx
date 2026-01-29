import { useEffect, useMemo, useState } from "react";
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
import { Loader2, ExternalLink, Play, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { problemsAPI } from "@/services/api";

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

  const handleRun = () => {
    if (!code.trim()) {
      toast({
        title: "Empty solution",
        description: "Please write your solution before running.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Run prepared",
      description: "Run endpoint will be connected later.",
    });
  };

  const handleSubmit = () => {
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
    toast({
      title: "Submit prepared",
      description: "Submit endpoint will be connected later.",
    });
  };

  const headerTags = useMemo(() => problem?.tags ?? [], [problem?.tags]);
  const sampleCases = useMemo(
    () => (problem?.test_cases ?? []).sort((a, b) => a.order - b.order),
    [problem?.test_cases]
  );
  const starterCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    (problem?.starter_codes ?? []).forEach((starter) => {
      map.set(starter.language.toLowerCase(), starter.code);
    });
    return map;
  }, [problem?.starter_codes]);

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

  if (problemLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Problem Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The problem you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <a href="/problems">Back to Problems</a>
        </Button>
      </div>
    );
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={getDifficultyColor(problem.difficulty)}>
                  {problem.difficulty}
                </Badge>
                <span className="text-sm text-muted-foreground">#{problem.id}</span>
              </div>
              <h1 className="text-2xl font-bold">{problem.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                {headerTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="capitalize">
                    {tag.replace(/-/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {problem.external_link && (
                <Button variant="outline" asChild>
                  <a 
                    href={problem.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Reference
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={handleRun} className="flex items-center">
                <Play className="h-4 w-4 mr-2" />
                Run
              </Button>
              <Button onClick={handleSubmit} className="flex items-center">
                <UploadCloud className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
        <Card className="min-h-[600px]">
          <CardContent className="p-0 h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <div className="border-b px-6 py-4">
                <TabsList>
                  <TabsTrigger value="description">Description</TabsTrigger>
                  <TabsTrigger value="examples">Examples</TabsTrigger>
                  <TabsTrigger value="constraints">Constraints</TabsTrigger>
                </TabsList>
              </div>
              <ScrollArea className="h-[520px] px-6 py-5">
                <TabsContent value="description" className="mt-0">
                  <div className="space-y-4 text-sm leading-6 whitespace-pre-wrap">
                    {problem.description ? (
                      problem.description
                    ) : (
                      <div className="text-muted-foreground">
                        No description yet. Add one in the backend to display it here.
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="examples" className="mt-0">
                  <div className="space-y-4">
                    {sampleCases.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No sample test cases yet.
                      </div>
                    ) : (
                      sampleCases.map((tc, index) => (
                        <div key={tc.id} className="rounded-md border bg-muted/20 p-4 space-y-2">
                          <div className="text-xs uppercase text-muted-foreground">
                            Example {index + 1}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Input:</span>
                            <div className="font-mono text-xs mt-1 bg-background border rounded p-2">
                              {tc.input_text}
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Output:</span>
                            <div className="font-mono text-xs mt-1 bg-background border rounded p-2">
                              {tc.output_text}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="constraints" className="mt-0">
                  <div className="text-sm text-muted-foreground">
                    Constraints will be added later.
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="javascript">JavaScript</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="cpp">C++</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-muted-foreground">
                  Starter code loaded for {language}
                </div>
              </div>
              <CodeEditor
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (value !== lastStarter) {
                    setHasUserEdits(true);
                  }
                }}
                height="520px"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-medium">Run Output</div>
              <div className="rounded-md border bg-muted/40 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
