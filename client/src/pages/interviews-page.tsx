import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { interviewsAPI, type Interview } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users, Clock3, ArrowRight } from "lucide-react";

const InterviewsPage = () => {
  const { data: interviews = [], isLoading } = useQuery<Interview[]>({
    queryKey: ["interviews"],
    queryFn: () => interviewsAPI.list(),
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-accent/10 p-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Recruiter Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Interviews</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Review every interview you have created, open candidate activity, and launch a new interview from a dedicated creation flow.
          </p>
        </div>
        <Link href="/interviews/new">
          <Button size="lg" className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Interview
          </Button>
        </Link>
      </section>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading interviews...
        </div>
      ) : interviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">No interviews yet</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Start by creating one interview. Then add candidates and track each candidate from the interview detail page.
              </p>
            </div>
            <Link href="/interviews/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Interview
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {interviews.map((interview) => (
            <Link key={interview.id} href={`/interviews/${interview.id}`}>
              <Card className="h-full cursor-pointer border-border/70 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{interview.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {interview.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{interview.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{interview.difficulty || "Unspecified"}</Badge>
                    <Badge variant="outline">
                      <Clock3 className="mr-1 h-3 w-3" />
                      {interview.duration_minutes} min
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Open candidate desk</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewsPage;
