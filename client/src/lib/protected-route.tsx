import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { AuthContext } from "@/hooks/use-auth";
import { useContext } from "react";

type ComponentType = () => React.JSX.Element;

export function ProtectedRoute({
  path,
  component: Component,
  allowedRoles = [],
}: {
  path: string;
  component: ComponentType;
  allowedRoles?: string[];
}) {
  const authContext = useContext(AuthContext);
  
  if (!authContext) {
    throw new Error("ProtectedRoute must be used within an AuthProvider");
  }
  
  const { user, isLoading } = authContext;

  if (isLoading) {
    return (
      <Route path={path}>
        {() => (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        {() => <Redirect to="/login" />}
      </Route>
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    const redirectPath = user.role === 'admin' 
      ? '/admin' 
      : user.role === 'guru' 
        ? '/guru' 
        : '/siswa';
    
    return (
      <Route path={path}>
        {() => <Redirect to={redirectPath} />}
      </Route>
    );
  }

  // Component is guaranteed to be a function that returns a JSX element
  return <Route path={path}>{() => <Component />}</Route>
}
