import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, School, Calendar } from 'lucide-react';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Validation schema for school settings form
const formSchema = z.object({
  schoolName: z.string().min(3, { message: 'Nama sekolah wajib diisi (minimal 3 karakter)' }),
  schoolAddress: z.string().min(5, { message: 'Alamat sekolah wajib diisi (minimal 5 karakter)' }),
  schoolLogo: z.string().default(''),
  headmasterName: z.string().min(3, { message: 'Nama kepala sekolah wajib diisi' }),
  headmasterNip: z.string().min(5, { message: 'NIP kepala sekolah wajib diisi' }),
  certHeader: z.string().default(''),
  certFooter: z.string().default(''),
  academicYear: z.string().min(5, { message: 'Tahun ajaran wajib diisi (contoh: 2024/2025)' }),
  graduationDate: z.string().min(5, { message: 'Tanggal kelulusan wajib diisi' }),
  cityName: z.string().min(2, { message: 'Nama kota wajib diisi' }),
  provinceName: z.string().min(2, { message: 'Nama provinsi wajib diisi' }),
});

type FormValues = z.infer<typeof formSchema>;

const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/settings');
        return await response.json();
      } catch (error) {
        // If no settings exist, return default values
        return {};
      }
    },
    enabled: isOpen, // Only fetch when modal is open
  });
  
  // Form hook
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: '',
      schoolAddress: '',
      schoolLogo: '',
      headmasterName: '',
      headmasterNip: '',
      certHeader: '',
      certFooter: '',
      academicYear: '',
      graduationDate: '',
      cityName: '',
      provinceName: '',
    },
  });
  
  // Update form values when settings data is loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        schoolName: settings.schoolName || '',
        schoolAddress: settings.schoolAddress || '',
        schoolLogo: settings.schoolLogo || '',
        headmasterName: settings.headmasterName || '',
        headmasterNip: settings.headmasterNip || '',
        certHeader: settings.certHeader || '',
        certFooter: settings.certFooter || '',
        academicYear: settings.academicYear || '',
        graduationDate: settings.graduationDate || '',
        cityName: settings.cityName || '',
        provinceName: settings.provinceName || '',
      });
    }
  }, [settings, form]);
  
  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // If settings exist, update them, otherwise create new settings
      const method = settings?.id ? 'PUT' : 'POST';
      const response = await apiRequest(method, '/api/settings', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Pengaturan sekolah berhasil disimpan',
        description: 'Data sekolah telah diperbarui',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal menyimpan pengaturan',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = (data: FormValues) => {
    saveSettingsMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pengaturan Data Sekolah</DialogTitle>
          <DialogDescription>
            Masukkan informasi sekolah yang akan ditampilkan pada sertifikat kelulusan
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
              <div className="space-y-5">
                <div className="flex items-center space-x-2 mb-2">
                  <School className="h-5 w-5 text-primary" />
                  <h3 className="text-md font-semibold">Informasi Sekolah</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="schoolName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Sekolah</FormLabel>
                        <FormControl>
                          <Input placeholder="Contoh: SMA Negeri 1 Jakarta" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="schoolAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alamat Sekolah</FormLabel>
                        <FormControl>
                          <Input placeholder="Alamat lengkap sekolah" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="headmasterName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Kepala Sekolah</FormLabel>
                        <FormControl>
                          <Input placeholder="Nama lengkap kepala sekolah" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="headmasterNip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NIP Kepala Sekolah</FormLabel>
                        <FormControl>
                          <Input placeholder="NIP Kepala Sekolah" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-md font-semibold">Informasi Kelulusan</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="academicYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tahun Ajaran</FormLabel>
                        <FormControl>
                          <Input placeholder="Contoh: 2024/2025" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="graduationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal Kelulusan</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cityName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kota</FormLabel>
                        <FormControl>
                          <Input placeholder="Nama kota" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="provinceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provinsi</FormLabel>
                        <FormControl>
                          <Input placeholder="Nama provinsi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="certHeader"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Header Sertifikat</FormLabel>
                      <FormControl>
                        <Input placeholder="Header tambahan untuk sertifikat (opsional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="certFooter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Footer Sertifikat</FormLabel>
                      <FormControl>
                        <Input placeholder="Footer tambahan untuk sertifikat (opsional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="mb-2 sm:mb-0"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Pengaturan'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SchoolSettingsModal;