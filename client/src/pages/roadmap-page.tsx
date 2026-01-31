import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Roadmap, UserProgress } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { roadmapAPI } from "@/services/api";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Check, 
  ExternalLink, 
  CheckCircle2, 
  Circle 
} from "lucide-react";

const RoadmapPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [completedSteps, setCompletedSteps] = useState<{[roadmapId: number]: number[]}>({});
  
  // Fetch roadmaps
  const { data: roadmapApi, isLoading } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () => roadmapAPI.getAllRoadmaps(),
  });
  const roadmaps: Roadmap[] = (roadmapApi || []).map(roadmapAPI.normalizeRoadmap);

  const fallbackRoadmaps: Roadmap[] = [
    {
      id: 101,
      title: "Data Structures Fundamentals",
      description: "Build a strong base in core data structures with guided steps.",
      steps: [
        {
          name: "Arrays & Strings",
          description: "Indexing, iteration patterns, two pointers, sliding window.",
          resources: ["Prefix sums", "Two pointers", "Sliding window"],
          skills: ["Arrays", "Strings", "Two Pointers"],
        },
        {
          name: "Stacks & Queues",
          description: "LIFO/FIFO, monotonic stack, BFS queue patterns.",
          resources: ["Monotonic stack", "Queue basics", "Deque usage"],
          skills: ["Stack", "Queue", "BFS"],
        },
        {
          name: "Hash Maps",
          description: "Counting, lookup, and collision‑safe strategies.",
          resources: ["Frequency map", "Two sum pattern", "Set usage"],
          skills: ["Hash Table", "Counting"],
        },
      ],
      createdAt: new Date(),
    },
    {
      id: 102,
      title: "String Mastery Roadmap",
      description: "A focused roadmap for mastering string manipulation problems.",
      steps: [
        {
          name: "String Parsing",
          description: "Split, trim, tokenization, and format handling.",
          resources: ["Parsing tokens", "Delimiter patterns"],
          skills: ["Parsing", "Edge cases"],
        },
        {
          name: "Pattern Matching",
          description: "KMP intuition, substrings, and rolling checks.",
          resources: ["Prefix table idea", "Substring search"],
          skills: ["KMP", "Substring"],
        },
        {
          name: "Anagrams & Frequency",
          description: "Counting and grouping, sliding window with maps.",
          resources: ["Frequency arrays", "Map windows"],
          skills: ["Anagrams", "Sliding Window"],
        },
      ],
      createdAt: new Date(),
    },
  ];

  const roadmapsToShow = roadmaps.length > 0 ? roadmaps : fallbackRoadmaps;
  
  // Fetch user progress
  const { data: userProgress, isLoading: progressLoading } = useQuery<UserProgress>({
    queryKey: ["/progress"],
    enabled: !!user,
    onError: () => {
      console.error("Failed to fetch user progress");
      toast({
        title: "Error", 
        description: "Failed to load your progress data. Please try again later.",
        variant: "destructive",
      });
    }
  });
  
  // Initialize completed steps from user progress data when it loads
  useEffect(() => {
    if (userProgress && 'roadmapProgress' in userProgress && userProgress.roadmapProgress) {
      try {
        const roadmapProgress = JSON.parse(userProgress.roadmapProgress as string);
        setCompletedSteps(roadmapProgress);
      } catch (e) {
        console.error("Failed to parse roadmap progress", e);
      }
    }
  }, [userProgress]);

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { roadmapId: number, completedSteps: number[] }) => {
      const res = await apiRequest("POST", "/progress/roadmap", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/progress"] });
      toast({
        title: "Progress updated",
        description: "Your roadmap progress has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate completion percentage for a roadmap
  const calculateCompletionPercentage = (roadmapId: number, totalSteps: number) => {
    if (!completedSteps[roadmapId] || !totalSteps) return 0;
    return Math.round((completedSteps[roadmapId].length / totalSteps) * 100);
  };

  // Toggle step completion
  const toggleStepCompletion = (roadmapId: number, stepIndex: number) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to track your progress",
        variant: "destructive",
      });
      return;
    }

    const currentCompletedSteps = completedSteps[roadmapId] || [];
    let newCompletedSteps: number[];
    
    if (currentCompletedSteps.includes(stepIndex)) {
      newCompletedSteps = currentCompletedSteps.filter(s => s !== stepIndex);
    } else {
      newCompletedSteps = [...currentCompletedSteps, stepIndex];
    }
    
    // Update local state
    setCompletedSteps({
      ...completedSteps,
      [roadmapId]: newCompletedSteps
    });
    
    // Send to server
    updateProgressMutation.mutate({
      roadmapId,
      completedSteps: newCompletedSteps
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Learning Roadmaps</h1>
        <p className="text-muted-foreground">
          Follow structured paths to master different areas of computer science and programming
        </p>
      </div>

      {isLoading && roadmaps.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {roadmapsToShow.map((roadmap) => (
            <Card key={roadmap.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{roadmap.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {roadmap.description}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (user) {
                        // Find the first accordion item and expand it
                        const firstStep = document.querySelector(`[data-state="closed"][value="step-0"]`) as HTMLElement;
                        if (firstStep) {
                          firstStep.click();
                          // Scroll to it
                          const openStep = document.querySelector(`[data-state="open"][value="step-0"]`) as HTMLElement;
                          if (openStep) {
                            openStep.scrollIntoView({ 
                              behavior: 'smooth',
                              block: 'start'
                            });
                          }
                        }
                      } else {
                        toast({
                          title: "Authentication required",
                          description: "Please sign in to track your progress",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {completedSteps[roadmap.id]?.length ? "Continue Roadmap" : "Start Roadmap"}
                  </Button>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>
                      {Array.isArray(roadmap.steps) 
                        ? calculateCompletionPercentage(roadmap.id, roadmap.steps.length) 
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={Array.isArray(roadmap.steps) 
                      ? calculateCompletionPercentage(roadmap.id, roadmap.steps.length) 
                      : 0} 
                    className="h-2" 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {Array.isArray(roadmap.steps) && roadmap.steps.map((step: any, index: number) => (
                    <div key={index} className="relative rounded-xl border bg-background/80 p-4 shadow-sm">
                      <div className="absolute -top-3 left-4 rounded-full border bg-background px-3 py-1 text-xs font-medium">
                        Step {index + 1}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold">{step.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {step.description || "Master the fundamentals and key concepts in this area."}
                          </p>
                        </div>
                        {user && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleStepCompletion(roadmap.id, index)}
                          >
                            {completedSteps[roadmap.id]?.includes(index) ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </Button>
                        )}
                      </div>

                      {Array.isArray(step.resources) && step.resources.length > 0 && (
                        <div className="mt-4">
                          <h5 className="text-xs font-semibold text-muted-foreground">Resources</h5>
                          <ul className="mt-2 space-y-1 text-sm">
                            {step.resources.map((resource: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-500" />
                                {resource}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {Array.isArray(step.skills)
                          ? step.skills.map((skill: string, idx: number) => (
                              <Badge key={idx} variant="outline">{skill}</Badge>
                            ))
                          : null}
                      </div>

                      <Button variant="link" size="sm" className="pl-0 mt-3">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View detailed guide
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoadmapPage;
