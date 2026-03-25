import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ArrowRight, Code2, Github, Loader2, Lock, Mail, Trophy, Workflow, Zap } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const registerSchema = loginSchema
  .extend({
    name: z.string().optional(),
    role: z.enum(["user", "recruiter"]).default("user"),
    confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type AuthMode = "login" | "register";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.1A6.55 6.55 0 0 1 5.5 12c0-.72.12-1.42.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15A10.93 10.93 0 0 0 12 1 11 11 0 0 0 2.18 7.07L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38Z" />
  </svg>
);

const AuthPage = () => {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      name: "",
      role: "user",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  if (user) return null;

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    const { confirmPassword, ...payload } = values;
    registerMutation.mutate(payload);
  };

  const busy = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="h-full min-h-0 overflow-hidden bg-background text-foreground">
      <div className="grid h-full min-h-0 md:grid-cols-2">
        <section className="relative hidden overflow-hidden border-r border-border bg-card md:flex md:items-center md:px-10 lg:px-14">
          <div className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-100">
            <div className="absolute -left-24 top-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -right-24 bottom-4 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
          </div>
          <div className="relative z-10 max-w-xl space-y-5">
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight lg:text-6xl">
              Forge Your
              <br />
              <span className="text-primary">Future.</span>
            </h1>
            <p className="max-w-lg text-lg leading-8 text-muted-foreground">
              Join 15k+ elite engineers and top-tier recruiters in the architectural darkroom.
            </p>
            <div className="space-y-4 pt-1">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-muted p-2.5 text-primary">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight">Integrated IDE</p>
                  <p className="text-sm text-muted-foreground">Low-latency execution environments for heavy syntax.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-muted p-2.5 text-secondary">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight">Curated Pipelines</p>
                  <p className="text-sm text-muted-foreground">Automated deployment tracks designed for kinetic engineers.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-muted p-2.5 text-amber-500">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight">Global Challenges</p>
                  <p className="text-sm text-muted-foreground">Synchronous architecture sprints with the world's best.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 items-center justify-center overflow-hidden p-4 md:p-6">
          <div className="w-full max-w-[480px]">
            <div className="mb-4 grid h-11 grid-cols-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-md text-sm font-bold transition ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded-md text-sm font-bold transition ${mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Create Account
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-2xl md:p-6">
              <h2 className="text-3xl font-black tracking-tight">{mode === "login" ? "Login" : "Create Account"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "login" ? "Access your workspace and synchronized data." : "Set up your profile and join the workspace."}
              </p>

              {mode === "login" ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="mt-5 space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Email Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                {...field}
                                autoComplete="username"
                                placeholder="engineer@codemaster.io"
                                disabled={busy}
                                className="h-11 bg-background pl-10"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Password</FormLabel>
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Forgot?</span>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                {...field}
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                disabled={busy}
                                className="h-11 bg-background pl-10"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="h-12 w-full text-base font-bold" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Login
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="mt-5 space-y-3">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} autoComplete="username" placeholder="engineer@codemaster.io" disabled={busy} className="h-10 bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Optional" disabled={busy} className="h-10 bg-background" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Role</FormLabel>
                            <FormControl>
                              <select {...field} disabled={busy} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option value="user">Candidate</option>
                                <option value="recruiter">Recruiter</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Password</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" autoComplete="new-password" placeholder="••••••••" disabled={busy} className="h-10 bg-background" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Confirm</FormLabel>
                            <FormControl>
                              <Input {...field} type="password" autoComplete="new-password" placeholder="••••••••" disabled={busy} className="h-10 bg-background" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="h-12 w-full text-base font-bold" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create Account
                      <Zap className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              )}

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Or continue with</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" disabled className="h-10">
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
                <Button type="button" variant="outline" disabled className="h-10">
                  <GoogleIcon />
                  <span className="ml-2">Google</span>
                </Button>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              By accessing CodeMaster, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">Terms of Service</a> and{" "}
              <a href="#" className="text-primary hover:underline">Security Protocol</a>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthPage;
