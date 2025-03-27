import React, { useEffect } from 'react';
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { PublicHeader } from '@/components/PublicHeader';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";

const loginFormSchema = z.object({
  username: z.string().min(1, "Username harus diisi"),
  password: z.string().min(1, "Password harus diisi"),
  role: z.enum(["admin", "guru", "siswa"])
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, isLoading } = useAuth();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "admin"
    }
  });

  useEffect(() => {
    // Redirect if user is logged in
    if (user) {
      const redirectPath = user.role === 'admin' 
        ? '/admin' 
        : user.role === 'guru' 
          ? '/guru' 
          : '/siswa';
          
      setLocation(redirectPath);
    }
  }, [user, setLocation]);

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <PublicHeader />
      
      <div className="flex flex-col items-center justify-center py-8">
        {/* Logo sekolah dengan animasi */}
        <motion.div 
          className="mb-8 flex flex-col items-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-40 h-40 bg-primary-50 rounded-full flex items-center justify-center shadow-lg mb-4 overflow-hidden">
            <motion.div
              className="relative w-32 h-32"
              animate={{ 
                rotateY: [0, 360],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                repeatType: "loop",
                ease: "linear",
                repeatDelay: 2
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
                <text x="50" y="40" textAnchor="middle" className="text-primary-900 font-bold text-xs">SMKN 1</text>
                <text x="50" y="55" textAnchor="middle" className="text-primary-900 font-bold text-xs">LUBUK</text>
                <text x="50" y="70" textAnchor="middle" className="text-primary-900 font-bold text-xs">SIKAPING</text>
              </svg>
            </motion.div>
          </div>
          <motion.h1 
            className="text-2xl font-bold text-center text-primary-800"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Aplikasi Surat Keterangan Lulus
          </motion.h1>
        </motion.div>

        <Card className="w-full max-w-lg bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Login ke Aplikasi SKL</CardTitle>
            <CardDescription className="text-center">
              Masukkan kredensial Anda untuk mengakses aplikasi
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {loginMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{loginMutation.error.message}</AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Masukkan username" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Masukkan password" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pilih Peran</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Peran" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="guru">Guru</SelectItem>
                          <SelectItem value="siswa">Siswa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending || isLoading}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="text-center text-sm text-muted-foreground">
            <motion.div 
              className="w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <p>© 2025 Aplikasi SKL - SMKN 1 Lubuk Sikaping</p>
            </motion.div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
