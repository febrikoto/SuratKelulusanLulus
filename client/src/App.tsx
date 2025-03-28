import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login-page";
import AdminDashboard from "@/pages/admin-dashboard";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import SubjectsPage from "@/pages/subjects-page";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

function AppRoutes() {
  // Note: useAuth adalah hook kustom yang digunakan dalam peran
  const [location, setLocation] = useLocation();
  
  // Simple handler untuk public routes saja
  useEffect(() => {
    // Redirect dari root ke login
    if (location === "/") {
      setLocation("/login");
    }
  }, [location, setLocation]);

  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/guru" component={TeacherDashboard} />
      <Route path="/siswa" component={StudentDashboard} />
      <Route path="/subjects" component={SubjectsPage} />
      <Route component={NotFound} />
    </Switch>
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
