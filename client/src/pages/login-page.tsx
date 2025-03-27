import React, { useState } from 'react';
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import PublicHeader from '@/components/PublicHeader';
import { apiRequest } from '@/lib/queryClient';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Username dan password harus diisi");
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/login", { username, password, role });
      const user = await response.json();
      
      // Redirect based on role
      const redirectPath = user.role === 'admin' 
        ? '/admin' 
        : user.role === 'guru' 
          ? '/guru' 
          : '/siswa';
          
      setLocation(redirectPath);
    } catch (err: any) {
      setError(err.message || "Login gagal. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <PublicHeader />
      
      <div className="flex flex-col items-center justify-center py-8">
        <Card className="w-full max-w-lg bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Login ke Aplikasi SKL</CardTitle>
            <CardDescription className="text-center">
              Masukkan kredensial Anda untuk mengakses aplikasi
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Pilih Peran</Label>
                <Select
                  value={role}
                  onValueChange={setRole}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Pilih Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="guru">Guru</SelectItem>
                    <SelectItem value="siswa">Siswa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="text-center text-sm text-muted-foreground">
            <p className="w-full">
              Untuk demo, gunakan username: admin, password: admin123 untuk role Admin
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
