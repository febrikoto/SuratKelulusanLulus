import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login-page";
import { ProtectedRoute } from "@/lib/protected-route";
import AdminDashboard from "@/pages/admin-dashboard";
import TeacherDashboard from "@/pages/teacher-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import { Loader2 } from "lucide-react";

function App() {
  return (
    <>
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route path="/login" component={LoginPage} />
        <ProtectedRoute path="/admin" component={AdminDashboard} />
        <ProtectedRoute path="/guru" component={TeacherDashboard} />
        <ProtectedRoute path="/siswa" component={StudentDashboard} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
