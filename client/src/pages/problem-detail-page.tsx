import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Problem } from "@shared/schema";
import CodeEditor from "@/components/CodeEditor";
import { 
  Card, 
  CardContent, 
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Save, BookmarkPlus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { problemsAPI } from "@/services/api";

const ProblemDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const problemId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [code, setCode] = useState("");

  const { data: problem, isLoading: problemLoading } = useQuery<Problem>({
    queryKey: ["problem", problemId],
    queryFn: () => problemsAPI.getProblemById(id),
    enabled: !isNaN(problemId),
  });

  // Save solution mutation
  const saveSolutionMutation = useMutation({
    mutationFn: async (data: { code: string; language: string }) => {
      return problemsAPI.submitSolution(id, data.code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problem", problemId] });
      toast({
        title: "Solution submitted",
        description: "Your solution has been submitted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit solution",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: savedSolution, isLoading: solutionLoading } = useQuery({
    queryKey: ["solution", problemId],
    queryFn: () => problemsAPI.getSolutionByProblem(problemId),
    enabled: !!user && !isNaN(problemId),
  });
  useEffect(() => {
    if (savedSolution?.code) {
      setCode(savedSolution.code);
    }
  }, [savedSolution]);



  const handleSaveSolution = () => {
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
    
    saveSolutionMutation.mutate({ code, language });
  };

  const handleResetCode = () => {
    setCode("");
  };

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
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center mb-2">
                <Badge
                  className={getDifficultyColor(problem.difficulty)}
                >
                  {problem.difficulty}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold">{problem.title}</h1>
              <div className="flex items-center mt-2 space-x-4">
                {problem.tags && problem.tags.length > 0 && (
                  <span className="flex items-center text-sm text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    {problem.tags.join(", ")}
                  </span>
                )}
                <span className="flex items-center text-sm text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                  Problem #{problem.id}
                </span>
              </div>
            </div>
            {problem.external_link && (
              <Button variant="outline" asChild>
                <a 
                  href={problem.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on LeetCode
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Code Editor */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            {/* <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
              </SelectContent>
            </Select> */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetCode}
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSaveSolution}
                className="flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Solution
              </Button>
            </div>
          </div>
          <CodeEditor
            value={code}
            onChange={setCode}
            height="500px"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ProblemDetailPage;
