import { createContext, ReactNode, useContext, useEffect } from "react";
import { useQuery, useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { authAPI, type User, type LoginData, type RegisterData } from "../services/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAdmin: boolean;
  isRecruiter: boolean;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<User | null, Error>({
    queryKey: ["user"],
    queryFn: authAPI.getCurrentUser,
    retry: false,
    enabled: !!localStorage.getItem('token')
  });

  
  const isAdmin = (user?.is_admin ?? false) || user?.role === "admin";
  const isRecruiter = isAdmin || user?.role === "recruiter";

  const getPostAuthPath = (nextUser: User | null | undefined) => {
    const nextIsAdmin = (nextUser?.is_admin ?? false) || nextUser?.role === "admin";
    const nextIsRecruiter = nextIsAdmin || nextUser?.role === "recruiter";
    return nextIsRecruiter ? "/interviews" : "/";
  };

  // Check if user is admin when accessing admin routes
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      if (isLoading) {
        // Wait for user data to load
        return;
      }
      
      if (!user || !isAdmin) {
        setLocation('/');
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
      }
    }
  }, [isAdmin, isLoading, user, setLocation, toast]);

  useEffect(() => {
    const handler = () => {
      queryClient.setQueryData(["user"], null);
      toast({
        title: "Session expired",
        description: "Please sign in again.",
        variant: "destructive",
      });
      setLocation("/auth");
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, [queryClient, setLocation, toast]);

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: async () => {
      const result = await refetchUser();
      const nextUser = result.data ?? queryClient.getQueryData<User | null>(["user"]);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      setLocation(getPostAuthPath(nextUser));
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authAPI.register,
    onSuccess: async () => {
      const result = await refetchUser();
      const nextUser = result.data ?? queryClient.getQueryData<User | null>(["user"]);
      toast({
        title: "Registration successful",
        description: "Welcome to CodePractice!",
      });
      setLocation(getPostAuthPath(nextUser));
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authAPI.logout,
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(["user"], null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isAdmin,
        isRecruiter,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
