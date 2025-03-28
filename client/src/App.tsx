import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login-page";
import AdminDashboard from "@/pages/admin-dashboard";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import SubjectsPage from "@/pages/subjects-page";
import GradesPage from "@/pages/grades-page";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthRedirect } from "@/components/auth-redirect";
import { useEffect, useState } from "react";

function AppRoutes() {
  return (
    <AuthRedirect>
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/guru" component={TeacherDashboard} />
        <Route path="/siswa" component={StudentDashboard} />
        <Route path="/subjects" component={SubjectsPage} />
        <Route path="/grades" component={GradesPage} />
        <Route component={NotFound} />
      </Switch>
    </AuthRedirect>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
