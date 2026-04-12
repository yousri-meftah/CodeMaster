import { lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeProvider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Loader2 } from "lucide-react";

// Pages
const HomePage = lazy(() => import("@/pages/home-page"));
const ProblemsPage = lazy(() => import("@/pages/problems-page"));
const ProblemDetailPage = lazy(() => import("@/pages/problem-detail-page"));
const ExplorePage = lazy(() => import("@/pages/explore-page"));
const RoadmapPage = lazy(() => import("@/pages/roadmap-page"));
const ProfilePage = lazy(() => import("@/pages/profile-page"));
const AdminPage = lazy(() => import("@/pages/admin-page"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const AuthCallbackPage = lazy(() => import("@/pages/auth-callback-page"));
const ArticleDetailPage = lazy(() => import("@/pages/article-detail-page"));
const InterviewsPage = lazy(() => import("@/pages/interviews-page"));
const InterviewCreatePage = lazy(() => import("@/pages/interview-create-page"));
const InterviewDetailPage = lazy(() => import("@/pages/interview-detail-page"));
const InterviewCandidateReviewPage = lazy(() => import("@/pages/interview-candidate-review-page"));
const InterviewCandidateRecordsPage = lazy(() => import("@/pages/interview-candidate-records-page"));
const InterviewCandidateLogsPage = lazy(() => import("@/pages/interview-candidate-logs-page"));
const InterviewEntryPage = lazy(() => import("@/pages/interview-entry-page"));
const InterviewSessionPage = lazy(() => import("@/pages/interview-session-page"));
const InterviewThankYouPage = lazy(() => import("@/pages/interview-thank-you-page"));
const NotFound = lazy(() => import("@/pages/not-found"));
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const interviewToken = sessionStorage.getItem("interview_active_token");
  const isChallengePath = location.startsWith("/challenge");
  const isProblemWorkspace = /^\/problems\/[^/]+$/.test(location);
  const isAuthPath = location === "/auth" || location === "/auth/callback";

  if (interviewToken && !isChallengePath) {
    return <Redirect to="/challenge/session" />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {!isChallengePath && <Header />}
      <main className={isChallengePath ? "flex-1" : isProblemWorkspace ? "flex-1 overflow-hidden" : isAuthPath ? "flex-1 overflow-hidden p-0" : "flex-1 container mx-auto px-4 py-6"}>
        <div key={location} className={isChallengePath ? "" : "animate-enter-soft"}>
          <Suspense fallback={<RouteFallback />}>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/problems" component={ProblemsPage} />
              <Route path="/problems/:id" component={ProblemDetailPage} />
              <Route path="/explore" component={ExplorePage} />
              <Route path="/roadmap" component={RoadmapPage} />
              <Route path="/articles/:id" component={ArticleDetailPage} />
              <Route path="/auth" component={AuthPage} />
              <Route path="/auth/callback" component={AuthCallbackPage} />
              <Route path="/challenge/session" component={InterviewSessionPage} />
              <Route path="/challenge/thank-you" component={InterviewThankYouPage} />
              <Route path="/challenge" component={InterviewEntryPage} />
              <Route path="/interview" component={InterviewEntryPage} />
              <ProtectedRoute path="/profile" component={ProfilePage} />
              <ProtectedRoute path="/interviews" component={InterviewsPage} requireRole="recruiter" />
              <ProtectedRoute path="/interviews/new" component={InterviewCreatePage} requireRole="recruiter" />
              <ProtectedRoute path="/interviews/:id/edit" component={InterviewCreatePage} requireRole="recruiter" />
              <ProtectedRoute path="/interviews/:id/candidates/:candidateId/records" component={InterviewCandidateRecordsPage} requireRole="recruiter" />
              <ProtectedRoute path="/interviews/:id/candidates/:candidateId/logs" component={InterviewCandidateLogsPage} requireRole="recruiter" />
              <ProtectedRoute path="/interviews/:id/candidates/:candidateId" component={InterviewCandidateReviewPage} requireRole="recruiter" />
              <ProtectedRoute path="/interviews/:id" component={InterviewDetailPage} requireRole="recruiter" />
              <ProtectedRoute path="/admin" component={AdminPage} requireRole="admin" />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </div>
      </main>
      {!isChallengePath && !isProblemWorkspace && !isAuthPath && <Footer />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
