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

  
  const isAdmin = user?.is_admin ?? false;

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

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: async () => {
      // After login, fetch user data
      await refetchUser();
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      setLocation("/");
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
      // After register, fetch user data
      await refetchUser();
      toast({
        title: "Registration successful",
        description: "Welcome to CodePractice!",
      });
      setLocation("/");
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
