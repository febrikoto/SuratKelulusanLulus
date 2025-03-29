import React, { useState, useEffect } from 'react';
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
  fullName: z.string().min(3, "Nama lengkap harus minimal 3 karakter"),
  assignedMajor: z.string().nullable()
});

type TeacherFormData = z.infer<typeof teacherFormSchema>;

interface EditTeacherModalProps {
  isOpen: boolean;
  teacher: any; // Replace with proper type
  onClose: () => void;
}

export const EditTeacherModal: React.FC<EditTeacherModalProps> = ({
  isOpen,
  teacher,
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
  
  // Initialize form with teacher data
  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      fullName: teacher?.fullName || '',
      assignedMajor: teacher?.assignedMajor || null
    }
  });
  
  // Update form values when teacher data changes
  useEffect(() => {
    if (teacher) {
      form.reset({
        fullName: teacher.fullName || '',
        assignedMajor: teacher.assignedMajor || null
      });
    }
  }, [teacher, form]);
  
  // Handle form submission
  const onSubmit = async (data: TeacherFormData) => {
    if (!teacher) return;
    
    setIsSubmitting(true);
    
    try {
      // Send patch request to update teacher (user)
      const response = await apiRequest(
        'PATCH',
        `/api/users/${teacher.id}`,
        data
      );
      
      if (!response.ok) {
        throw new Error('Failed to update teacher');
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
      
      toast({
        title: "Berhasil",
        description: "Data guru berhasil diperbarui",
        variant: "default"
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating teacher:', error);
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat memperbarui data guru",
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
          <DialogTitle>Edit Data Guru</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <SelectItem value="">
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