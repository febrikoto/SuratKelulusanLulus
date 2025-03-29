import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: number;
}

const formSchema = z.object({
  nisn: z.string().min(1, "NISN is required").max(20),
  nis: z.string().min(1, "NIS is required").max(20),
  fullName: z.string().min(1, "Full name is required").max(100),
  birthPlace: z.string().min(1, "Birth place is required").max(100),
  birthDate: z.string().min(1, "Birth date is required"),
  parentName: z.string().min(1, "Parent name is required").max(100),
  className: z.string().min(1, "Class is required").max(20),
});

type FormValues = z.infer<typeof formSchema>;

export const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, studentId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nisn: '',
      nis: '',
      fullName: '',
      birthPlace: '',
      birthDate: '',
      parentName: '',
      className: '',
    },
  });
  
  // Fetch class list from settings
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });
  
  // Parse classList from settings
  const classOptions = settings?.classList ? 
    settings.classList.split(',').map((className: string) => className.trim()) : 
    ['XII IPA 1', 'XII IPA 2', 'XII IPS 1', 'XII IPS 2']; // Default values if settings not loaded
  
  // Fetch student data
  const { data: student, isLoading: isLoadingStudent } = useQuery({
    queryKey: ['/api/students', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const res = await apiRequest('GET', `/api/students/${studentId}`);
      return res.json();
    },
    enabled: !!studentId && isOpen,
  });
  
  // Update form when student data is loaded
  useEffect(() => {
    if (student) {
      form.reset({
        nisn: student.nisn,
        nis: student.nis,
        fullName: student.fullName,
        birthPlace: student.birthPlace,
        birthDate: student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
        parentName: student.parentName,
        className: student.className,
      });
    }
  }, [student, form]);

  const updateStudentMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!studentId) throw new Error('Student ID not provided');
      const res = await apiRequest('PUT', `/api/students/${studentId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Data siswa berhasil diupdate",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    updateStudentMutation.mutate(data);
  };

  if (isLoadingStudent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Data Siswa</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nisn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NISN</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Masukkan NISN" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIS</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Masukkan NIS" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Masukkan nama lengkap" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birthPlace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempat Lahir</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Masukkan tempat lahir" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="parentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Orang Tua</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Masukkan nama orang tua" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="className"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kelas</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kelas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classOptions.map((className: string) => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Batal
              </Button>
              <Button 
                type="submit"
                disabled={updateStudentMutation.isPending}
              >
                {updateStudentMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditStudentModal;