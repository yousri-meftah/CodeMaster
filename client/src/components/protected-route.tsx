import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // If still loading, don't render anything
  if (isLoading) {
    return null;
  }

  // If not logged in, redirect to home
  if (!user) {
    setLocation("/");
    return null;
  }

  // If admin access required but user is not admin, redirect to home
  if (requireAdmin && !isAdmin) {
    setLocation("/");
    return null;
  }

  // If all checks pass, render the children
  return <>{children}</>;
} 