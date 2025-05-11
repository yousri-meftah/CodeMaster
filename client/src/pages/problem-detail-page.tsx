import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Problem, UserSolution, InsertComment } from "@shared/schema";
import CodeEditor from "@/components/CodeEditor";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, ExternalLink, Save, BookmarkPlus, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ProblemDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const problemId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [commentText, setCommentText] = useState("");

  // Fetch problem details
  const { data: problem, isLoading: problemLoading } = useQuery<Problem>({
    queryKey: [`/api/problems/${problemId}`],
    enabled: !isNaN(problemId),
  });

  // Fetch user's solution if logged in
  const { data: userSolution, isLoading: solutionLoading } = useQuery<UserSolution>({
    queryKey: [`/api/user/solutions/${problemId}`],
    enabled: !!user && !isNaN(problemId),
  });

  // Fetch problem comments
  const { data: comments, isLoading: commentsLoading } = useQuery<any[]>({
    queryKey: [`/api/comments/problem/${problemId}`],
    enabled: !isNaN(problemId),
  });

  // Save solution mutation
  const saveSolutionMutation = useMutation({
    mutationFn: async (data: { code: string; language: string }) => {
      const payload = {
        problemId,
        code: data.code,
        language: data.language,
        solved: true,
      };
      
      if (userSolution) {
        return apiRequest("PUT", `/api/user/solutions/${userSolution.id}`, payload);
      } else {
        return apiRequest("POST", "/api/user/solutions", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/solutions/${problemId}`] });
      toast({
        title: "Solution saved",
        description: "Your code has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save solution",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (favorite: boolean) => {
      // If solution exists, update it with new favorite status
      if (userSolution) {
        return apiRequest("PUT", `/api/user/solutions/${userSolution.id}`, {
          favorite
        });
      } else {
        // Create a new solution with only favorite status
        return apiRequest("POST", "/api/user/solutions", {
          problemId,
          favorite,
          code: "",
          language: "javascript",
          solved: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/solutions/${problemId}`] });
      toast({
        title: userSolution?.favorite ? "Removed from favorites" : "Added to favorites",
        description: userSolution?.favorite 
          ? "Problem removed from your favorites."
          : "Problem added to your favorites.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Post comment mutation
  const postCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const payload: Partial<InsertComment> = {
        problemId,
        content,
      };
      return apiRequest("POST", "/api/comments", payload);
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: [`/api/comments/problem/${problemId}`] });
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize code editor with user's saved solution
  useState(() => {
    if (userSolution) {
      setCode(userSolution.code);
      setLanguage(userSolution.language);
    }
  });

  const handleSaveSolution = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save your solution.",
        variant: "destructive",
      });
      return;
    }
    
    saveSolutionMutation.mutate({ code, language });
  };

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to post a comment.",
        variant: "destructive",
      });
      return;
    }
    
    postCommentMutation.mutate(commentText);
  };

  const handleResetCode = () => {
    if (userSolution) {
      setCode(userSolution.code);
    } else {
      setCode("");
    }
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

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Problem Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center mb-2">
                <Badge
                  className={
                    problem.difficulty === "easy"
                      ? "bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800"
                      : problem.difficulty === "medium"
                      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-800"
                      : "bg-red-100 text-red-800 hover:bg-red-100 hover:text-red-800"
                  }
                >
                  {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                </Badge>
                {problem.successRate && (
                  <span className="text-muted-foreground text-sm ml-2">
                    Success Rate: {problem.successRate}%
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold">{problem.title}</h1>
              <div className="flex items-center mt-2 space-x-4">
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
                  {problem.categories?.map((category, index) => (
                    <span key={category}>
                      {category
                        .split("-")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")}
                      {index < (problem.categories?.length || 0) - 1 ? ", " : ""}
                    </span>
                  ))}
                </span>
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
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline"
                onClick={() => {
                  if (!user) {
                    toast({
                      title: "Authentication required",
                      description: "Please log in to save this problem to favorites.",
                      variant: "destructive",
                    });
                    return;
                  }

                  // Toggle favorite status
                  toggleFavoriteMutation.mutate(!userSolution?.favorite);
                }}
                disabled={toggleFavoriteMutation.isPending}
              >
                {toggleFavoriteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  userSolution?.favorite ? (
                    <>
                      <BookmarkPlus className="mr-2 h-4 w-4 fill-primary" /> Saved
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="mr-2 h-4 w-4" /> Save
                    </>
                  )
                )}
              </Button>
              <Button asChild>
                <a
                  href={problem.externalUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Solve on LeetCode
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Problem Description */}
      <Card>
        <CardHeader>
          <CardTitle>Problem Description</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: problem.description }} />
          </div>
        </CardContent>
      </Card>

      {/* Your Solution */}
      <Card>
        <CardHeader>
          <CardTitle>Your Solution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full md:w-auto">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <CodeEditor
              language={language}
              value={code}
              onChange={setCode}
              height="300px"
            />
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleResetCode}
              disabled={saveSolutionMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button
              onClick={handleSaveSolution}
              disabled={saveSolutionMutation.isPending}
            >
              {saveSolutionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Solution
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Discussion Section */}
      <Card>
        <CardHeader>
          <CardTitle>Discussion</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Comments */}
          <div className="space-y-6 mb-6">
            {commentsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : comments && comments.length > 0 ? (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-b border-border pb-6"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-medium text-primary">
                        {comment.username?.substring(0, 2).toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{comment.username || "User"}</h3>
                          <p className="text-sm text-muted-foreground">
                            Posted on {formatDate(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-foreground">
                        <p>{comment.content}</p>
                      </div>
                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        <button className="text-muted-foreground hover:text-foreground">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1 inline"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                            />
                          </svg>
                          {comment.likes || 0}
                        </button>
                        <button className="text-muted-foreground hover:text-foreground">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1 inline"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                            />
                          </svg>
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">
                  No comments yet. Be the first to share your thoughts!
                </p>
              </div>
            )}
          </div>

          {/* Add Comment */}
          <div>
            <h3 className="font-medium mb-3">Add a Comment</h3>
            <Textarea
              className="w-full resize-none h-24 mb-2"
              placeholder="Share your thoughts..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={handlePostComment}
                disabled={!commentText.trim() || postCommentMutation.isPending}
              >
                {postCommentMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Post Comment"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProblemDetailPage;
