import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface AuthRedirectProps {
  children: React.ReactNode;
}

export function AuthRedirect({ children }: AuthRedirectProps) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      // User is authenticated, redirect based on role
      const redirectPath = 
        user.role === 'admin' ? '/admin' : 
        user.role === 'guru' ? '/guru' : 
        '/siswa';
      
      // Use window.location.pathname to check current path
      const currentPath = window.location.pathname;
      
      // If the user is on login page or root, redirect to the appropriate dashboard
      if (currentPath === '/' || currentPath === '/login') {
        console.log('Redirecting to', redirectPath);
        navigate(redirectPath);
      }
    } else if (!isLoading && !user) {
      // User is not authenticated, redirect to login if on a protected route
      const currentPath = window.location.pathname;
      const isProtectedRoute = 
        currentPath.startsWith('/admin') || 
        currentPath.startsWith('/guru') || 
        currentPath.startsWith('/siswa') ||
        currentPath.startsWith('/subjects') ||
        currentPath.startsWith('/grades');
      
      if (isProtectedRoute) {
        console.log('Redirecting to login');
        navigate('/login');
      }
    }
  }, [user, isLoading, navigate]);

  // Show loading state while authentication is in progress
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}