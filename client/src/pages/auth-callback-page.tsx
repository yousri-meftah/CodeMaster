import { useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { authAPI } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const AuthCallbackPage = () => {
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const search = useMemo(() => new URLSearchParams(window.location.search), []);
  const requiresRoleSelection = search.get("requires_role_selection") === "1";
  const provider = search.get("provider") ?? "oauth";

  const roleMutation = useMutation({
    mutationFn: (role: "user" | "recruiter") => authAPI.completeSocialRole(role),
    onSuccess: async (result) => {
      await refreshUser();
      toast({
        title: "Profile completed",
        description: `Signed in with ${provider}.`,
      });
      setLocation(result.user.role === "recruiter" || result.user.role === "admin" ? "/interviews" : "/");
    },
    onError: (error: Error) => {
      toast({
        title: "Role selection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (requiresRoleSelection) {
      return;
    }
    let active = true;
    refreshUser()
      .then((user) => {
        if (!active) return;
        if (!user) {
          setLocation("/auth");
          return;
        }
        toast({
          title: "Signed in",
          description: `Connected with ${provider}.`,
        });
        setLocation(user.role === "recruiter" || user.role === "admin" ? "/interviews" : "/");
      })
      .catch(() => {
        if (!active) return;
        setLocation("/auth");
      });
    return () => {
      active = false;
    };
  }, [provider, refreshUser, requiresRoleSelection, setLocation, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-xl border-border/60 bg-card/95 shadow-2xl">
        <CardHeader>
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>{requiresRoleSelection ? "Choose Your Workspace" : "Completing Sign-In"}</CardTitle>
          <CardDescription>
            {requiresRoleSelection
              ? `Your ${provider} account is connected. Choose how you want to use CodeMaster.`
              : `Finalizing your ${provider} session.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requiresRoleSelection ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="h-auto min-h-24 flex-col items-start gap-2 whitespace-normal p-5 text-left"
                disabled={roleMutation.isPending}
                onClick={() => roleMutation.mutate("user")}
              >
                <span className="text-sm font-black uppercase tracking-[0.18em]">Candidate</span>
                <span className="text-xs font-normal opacity-80">Practice problems, track progress, and take interview sessions.</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto min-h-24 flex-col items-start gap-2 whitespace-normal p-5 text-left"
                disabled={roleMutation.isPending}
                onClick={() => roleMutation.mutate("recruiter")}
              >
                <span className="text-sm font-black uppercase tracking-[0.18em]">Recruiter</span>
                <span className="text-xs font-normal opacity-80">Create interviews, invite candidates, and review media and activity.</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your account from the new cookie session...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallbackPage;
