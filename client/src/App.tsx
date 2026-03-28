import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeProvider";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

// Pages
import HomePage from "@/pages/home-page";
import ProblemsPage from "@/pages/problems-page";
import ProblemDetailPage from "@/pages/problem-detail-page";
import ExplorePage from "@/pages/explore-page";
import RoadmapPage from "@/pages/roadmap-page";
import ProfilePage from "@/pages/profile-page";
import AdminPage from "@/pages/admin-page";
import AuthPage from "@/pages/auth-page";
import AuthCallbackPage from "@/pages/auth-callback-page";
import ArticleDetailPage from "@/pages/article-detail-page";
import InterviewsPage from "@/pages/interviews-page";
import InterviewCreatePage from "@/pages/interview-create-page";
import InterviewDetailPage from "@/pages/interview-detail-page";
import InterviewCandidateReviewPage from "@/pages/interview-candidate-review-page";
import InterviewCandidateRecordsPage from "@/pages/interview-candidate-records-page";
import InterviewCandidateLogsPage from "@/pages/interview-candidate-logs-page";
import InterviewEntryPage from "@/pages/interview-entry-page";
import InterviewSessionPage from "@/pages/interview-session-page";
import InterviewThankYouPage from "@/pages/interview-thank-you-page";
import NotFound from "@/pages/not-found";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

function Router() {
  const [location] = useLocation();
  const interviewToken = sessionStorage.getItem("interview_active_token");
  const isChallengePath = location.startsWith("/challenge");
  const isProblemWorkspace = /^\/problems\/[^/]+$/.test(location);
  const isAuthPath = location === "/auth" || location === "/auth/callback";

  if (interviewToken && !isChallengePath) {
    return <Redirect to={`/challenge/session?token=${encodeURIComponent(interviewToken)}`} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {!isChallengePath && <Header />}
      <main className={isChallengePath ? "flex-1" : isProblemWorkspace ? "flex-1 overflow-hidden" : isAuthPath ? "flex-1 overflow-hidden p-0" : "flex-1 container mx-auto px-4 py-6"}>
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
