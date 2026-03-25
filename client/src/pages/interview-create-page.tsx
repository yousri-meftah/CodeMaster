import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { interviewsAPI, problemsAPI } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, Save } from "lucide-react";

type ProblemOption = {
  id: number;
  title: string;
  difficulty: string;
};

type InterviewFormState = {
  title: string;
  description: string;
  difficulty: string;
  duration_minutes: number;
  availability_days: number;
  status: string;
  antiCheat: boolean;
  navigation: string;
};

const InterviewCreatePage = () => {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const interviewId = Number(params.id);
  const isEditMode = Number.isFinite(interviewId);
  const [selectedProblemIds, setSelectedProblemIds] = useState<number[]>([]);
  const [form, setForm] = useState<InterviewFormState>({
    title: "",
    description: "",
    difficulty: "Medium",
    duration_minutes: 60,
    availability_days: 7,
    status: "draft",
    antiCheat: true,
    navigation: "restricted",
  });

  const { data: problemsPage, isLoading } = useQuery<{ items: ProblemOption[]; total: number; page: number; page_size: number }>({
    queryKey: ["problems"],
    queryFn: async () => {
      const pageSize = 100;
      const first = await problemsAPI.getAllProblems({ page: 1, page_size: pageSize });
      if (first.total <= first.items.length) {
        return first;
      }

      const pages = Math.ceil(first.total / pageSize);
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, index) =>
          problemsAPI.getAllProblems({ page: index + 2, page_size: pageSize }),
        ),
      );

      return {
        items: [first, ...rest].flatMap((page) => page.items),
        total: first.total,
        page: 1,
        page_size: pageSize,
      };
    },
  });

  const { data: existingInterview, isLoading: isLoadingInterview } = useQuery({
    queryKey: ["interview", interviewId],
    queryFn: () => interviewsAPI.getById(interviewId),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (!existingInterview) return;
    setForm({
      title: existingInterview.title,
      description: existingInterview.description ?? "",
      difficulty: existingInterview.difficulty ?? "Medium",
      duration_minutes: existingInterview.duration_minutes,
      availability_days: existingInterview.availability_days,
      status: existingInterview.status,
      antiCheat: Boolean((existingInterview.settings as Record<string, unknown>)?.anti_cheat ?? true),
      navigation: String((existingInterview.settings as Record<string, unknown>)?.navigation ?? "restricted"),
    });
    setSelectedProblemIds(
      [...existingInterview.problems]
        .sort((a, b) => a.order - b.order)
        .map((problem) => problem.id),
    );
  }, [existingInterview]);

  const saveMutation = useMutation({
    mutationFn: () =>
      isEditMode
        ? interviewsAPI.update(interviewId, {
            title: form.title,
            description: form.description,
            difficulty: form.difficulty,
            duration_minutes: Number(form.duration_minutes),
            availability_days: Number(form.availability_days),
            status: form.status,
            settings: {
              anti_cheat: form.antiCheat,
              navigation: form.navigation,
            },
            problems: selectedProblemIds.map((problemId, index) => ({ problem_id: problemId, order: index })),
          })
        : interviewsAPI.create({
            title: form.title,
            description: form.description,
            difficulty: form.difficulty,
            duration_minutes: Number(form.duration_minutes),
            availability_days: Number(form.availability_days),
            status: form.status,
            settings: {
              anti_cheat: form.antiCheat,
              navigation: form.navigation,
            },
            problems: selectedProblemIds.map((problemId, index) => ({ problem_id: problemId, order: index })),
          }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      queryClient.invalidateQueries({ queryKey: ["interview", interviewId] });
      toast({
        title: isEditMode ? "Interview updated" : "Interview created",
        description: isEditMode ? "Interview changes saved successfully." : "Now add candidates and monitor their activity.",
      });
      setLocation(`/interviews/${created.id}`);
    },
    onError: (error: Error) => {
      toast({ title: isEditMode ? "Update failed" : "Create failed", description: error.message, variant: "destructive" });
    },
  });

  const problemOptions = problemsPage?.items ?? [];
  const selectedProblems = useMemo(
    () =>
      selectedProblemIds
        .map((id) => problemOptions.find((problem) => problem.id === id))
        .filter((problem): problem is ProblemOption => Boolean(problem)),
    [problemOptions, selectedProblemIds],
  );
  const availableProblems = useMemo(
    () => problemOptions.filter((problem) => !selectedProblemIds.includes(problem.id)),
    [problemOptions, selectedProblemIds],
  );

  const moveProblem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedProblemIds.length) return;
    const next = [...selectedProblemIds];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    setSelectedProblemIds(next);
  };

  const availabilityOptions = [1, 3, 7, 14, 30];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Link href="/interviews" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to interviews
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{isEditMode ? "Edit Interview" : "Create Interview"}</h1>
          <p className="text-sm text-muted-foreground">Set interview metadata and select the exact problem order candidates should solve.</p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!form.title.trim() || selectedProblemIds.length === 0 || saveMutation.isPending || isLoadingInterview}
        >
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isEditMode ? "Update Interview" : "Save Interview"}
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Interview Setup</CardTitle>
            <CardDescription>Use plain settings recruiters expect to see and edit later if needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Input value={form.difficulty} onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration_minutes}
                  onChange={(event) => setForm((prev) => ({ ...prev, duration_minutes: Number(event.target.value || 0) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Link Valid For (days)</label>
                <Select
                  value={String(form.availability_days)}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, availability_days: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose validity window" />
                  </SelectTrigger>
                  <SelectContent>
                    {availabilityOptions.map((days) => (
                      <SelectItem key={days} value={String(days)}>
                        {days} day{days === 1 ? "" : "s"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Input value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <label className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.antiCheat}
                  onChange={(event) => setForm((prev) => ({ ...prev, antiCheat: event.target.checked }))}
                />
                Anti-cheat logging
              </label>
              <div className="space-y-2">
                <label className="text-sm font-medium">Navigation Rule</label>
                <Input value={form.navigation} onChange={(event) => setForm((prev) => ({ ...prev, navigation: event.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selected Problems</CardTitle>
              <CardDescription>The order here will be the order candidates see.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedProblems.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Choose one or more problems from the bank below.</p>
              ) : (
                selectedProblems.map((problem, index) => (
                  <div key={problem.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{index + 1}. {problem.title}</p>
                        <p className="text-xs text-muted-foreground">{problem.difficulty}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => moveProblem(index, -1)}>Up</Button>
                        <Button size="sm" variant="outline" onClick={() => moveProblem(index, 1)}>Down</Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedProblemIds((prev) => prev.filter((id) => id !== problem.id))}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Problem Bank</CardTitle>
              <CardDescription>Add only existing platform problems.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading problems...
                </div>
              ) : (
                <ScrollArea className="h-80">
                  <div className="space-y-2">
                    {availableProblems.map((problem) => (
                      <div key={problem.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{problem.title}</p>
                          <Badge variant="outline" className="mt-2">{problem.difficulty}</Badge>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setSelectedProblemIds((prev) => [...prev, problem.id])}>
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewCreatePage;
