import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { ElementType } from "react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  requireRole,
}: {
  path: string;
  component: ElementType;
  requireRole?: "admin" | "recruiter";
}) {
  const { user, isLoading, isAdmin, isRecruiter } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (requireRole === "admin" && !isAdmin) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  if (requireRole === "recruiter" && !isRecruiter) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}
