import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { LoginData } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserInfo } from "@shared/types";

type AuthContextType = {
  user: UserInfo | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserInfo, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  updateWelcomeStatus: (hasSeenWelcome: boolean) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserInfo | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000, // Cache valid for 5 minutes
    refetchOnWindowFocus: false, // Prevent refetching when window gains focus
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: UserInfo) => {
      // Set user data in cache immediately
      queryClient.setQueryData(["/api/user"], user);
      
      // Optimized preloading logic with better error handling
      // Use Promise.all to load all data in parallel
      Promise.all([
        // Preload settings with error handling
        fetch('/api/settings')
          .then(response => {
            if (!response.ok) throw new Error(`Settings API returned ${response.status}`);
            return response.json();
          })
          .then(data => {
            queryClient.setQueryData(["/api/settings"], data);
            return true;
          })
          .catch(err => {
            console.error("Failed to prefetch settings:", err);
            return false;
          }),
        
        // Preload dashboard stats with error handling
        fetch('/api/dashboard/stats')
          .then(response => {
            if (!response.ok) throw new Error(`Dashboard stats API returned ${response.status}`);
            return response.json();
          })
          .then(data => {
            queryClient.setQueryData(["/api/dashboard/stats"], data);
            return true;
          })
          .catch(err => {
            console.error("Failed to prefetch dashboard stats:", err);
            return false;
          }),
          
        // Preload students data with error handling (for admin and teacher roles)
        user.role !== 'siswa' ? 
          fetch('/api/students')
            .then(response => {
              if (!response.ok) throw new Error(`Students API returned ${response.status}`);
              return response.json();
            })
            .then(data => {
              queryClient.setQueryData(["/api/students"], data);
              return true;
            })
            .catch(err => {
              console.error("Failed to prefetch students:", err);
              return false;
            })
          : Promise.resolve(true) // Skip for student role
      ]);
      
      toast({
        title: "Login Berhasil",
        description: `Selamat datang, ${user.fullName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login Gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear user data in cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Clear all query caches on logout
      queryClient.clear();
      
      toast({
        title: "Logout Berhasil",
        description: "Anda telah keluar dari sistem",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout Gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to update welcome status
  const updateWelcomeStatus = async (hasSeenWelcome: boolean) => {
    try {
      await apiRequest("POST", "/api/user/welcome-status", { hasSeenWelcome });
      
      // Update the user data in the cache
      if (user) {
        queryClient.setQueryData(["/api/user"], {
          ...user,
          hasSeenWelcome
        });
      }
    } catch (error) {
      console.error("Failed to update welcome status:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        updateWelcomeStatus
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
