import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

// Define the form schema
const teacherFormSchema = z.object({
  username: z.string().min(3, "Username harus minimal 3 karakter"),
  password: z.string().min(6, "Password harus minimal 6 karakter"),
  fullName: z.string().min(3, "Nama lengkap harus minimal 3 karakter"),
  assignedMajor: z.string().nullable()
});

type TeacherFormData = z.infer<typeof teacherFormSchema>;

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTeacherModal: React.FC<AddTeacherModalProps> = ({
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch settings to get the major list
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    }
  });
  
  // Parse major list from settings
  const majorList = settings?.majorList ? settings.majorList.split(',').map((major: string) => major.trim()) : [];
  
  // Initialize form
  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      username: '',
      password: '',
      fullName: '',
      assignedMajor: null
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: TeacherFormData) => {
    setIsSubmitting(true);
    
    try {
      // Process form data - convert "null" string to actual null
      const processedData = {
        ...data,
        role: 'guru', // Set role to 'guru'
        assignedMajor: data.assignedMajor === "null" ? null : data.assignedMajor
      };
      
      // Send request to create teacher (user)
      const response = await apiRequest(
        'POST',
        '/api/users',
        processedData
      );
      
      if (!response.ok) {
        throw new Error('Failed to create teacher');
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      
      toast({
        title: "Berhasil",
        description: "Guru baru berhasil ditambahkan",
        variant: "default"
      });
      
      // Reset form
      form.reset();
      
      onClose();
    } catch (error) {
      console.error('Error creating teacher:', error);
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menambahkan guru",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to render the major select options
  const renderMajorOptions = () => {
    return majorList.map(major => (
      <SelectItem key={major} value={major}>
        {major}
      </SelectItem>
    ));
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tambah Guru Baru</DialogTitle>
        </DialogHeader>
        
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
                      placeholder="Username untuk login" 
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
                      placeholder="Password untuk login" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nama lengkap guru" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="assignedMajor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jurusan yang Diampu</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jurusan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">
                        <span className="text-muted-foreground">Tidak Ada / Semua Jurusan</span>
                      </SelectItem>
                      {renderMajorOptions()}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTeacherModal;