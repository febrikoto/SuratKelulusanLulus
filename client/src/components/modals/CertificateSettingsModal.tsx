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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FileText, CalendarDays, Clock } from 'lucide-react';

interface CertificateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Validation schema for certificate settings form
const formSchema = z.object({
  certHeader: z.string().default('SURAT KETERANGAN LULUS'),
  certFooter: z.string().default('Surat ini berlaku sebagai bukti kelulusan sampai ijazah diterbitkan.'),
  certBeforeStudentData: z.string().default('Yang bertanda tangan di bawah ini, Kepala SMK Negeri 1 Lubuk Sikaping, menerangkan bahwa yang bersangkutan:'),
  certAfterStudentData: z.string().default('telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan.'),
  certNumberPrefix: z.string().default(''),
  certRegulationText: z.string().default('Berdasarkan Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 Tahun 2022 tentang Standar Penilaian Pendidikan pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah.'),
  certCriteriaText: z.string().default('Kepala Sekolah berdasarkan ketentuan yang berlaku mempertimbangan kelulusan peserta didik pada Tahun Pelajaran 2024/2025, diantaranya sebagai berikut:'),
  academicYear: z.string().default(''),
  graduationDate: z.string().default(''),
  graduationTime: z.string().default(''),
  cityName: z.string().default(''),
  provinceName: z.string().default(''),
});

type FormValues = z.infer<typeof formSchema>;

const CertificateSettingsModal: React.FC<CertificateSettingsModalProps> = ({ isOpen, onClose }) => {
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
      certHeader: 'SURAT KETERANGAN LULUS',
      certFooter: 'Surat ini berlaku sebagai bukti kelulusan sampai ijazah diterbitkan.',
      certBeforeStudentData: 'Yang bertanda tangan di bawah ini, Kepala SMK Negeri 1 Lubuk Sikaping, menerangkan bahwa yang bersangkutan:',
      certAfterStudentData: 'telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan.',
      certNumberPrefix: '',
      certRegulationText: 'Berdasarkan Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 Tahun 2022 tentang Standar Penilaian Pendidikan pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah.',
      certCriteriaText: 'Kepala Sekolah berdasarkan ketentuan yang berlaku mempertimbangan kelulusan peserta didik pada Tahun Pelajaran 2024/2025, diantaranya sebagai berikut:',
      academicYear: '',
      graduationDate: '',
      graduationTime: '',
      cityName: '',
      provinceName: '',
    },
  });
  
  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        certHeader: settings.certHeader || 'SURAT KETERANGAN LULUS',
        certFooter: settings.certFooter || 'Surat ini berlaku sebagai bukti kelulusan sampai ijazah diterbitkan.',
        certBeforeStudentData: settings.certBeforeStudentData || 'Yang bertanda tangan di bawah ini, Kepala SMK Negeri 1 Lubuk Sikaping, menerangkan bahwa yang bersangkutan:',
        certAfterStudentData: settings.certAfterStudentData || 'telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan.',
        certNumberPrefix: settings.certNumberPrefix || '',
        certRegulationText: settings.certRegulationText || 'Berdasarkan Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 Tahun 2022 tentang Standar Penilaian Pendidikan pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah.',
        certCriteriaText: settings.certCriteriaText || 'Kepala Sekolah berdasarkan ketentuan yang berlaku mempertimbangan kelulusan peserta didik pada Tahun Pelajaran 2024/2025, diantaranya sebagai berikut:',
        academicYear: settings.academicYear || '',
        graduationDate: settings.graduationDate || '',
        graduationTime: settings.graduationTime || '',
        cityName: settings.cityName || '',
        provinceName: settings.provinceName || '',
      });
    }
  }, [settings, form]);
  
  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: Partial<FormValues>) => {
      // If settings exist, update them, otherwise create new settings
      const method = settings?.id ? 'PUT' : 'POST';
      const response = await apiRequest(method, '/api/settings', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Pengaturan SKL berhasil disimpan',
        description: 'Pengaturan teks dan format SKL telah diperbarui',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      onClose();
    },
    onError: (error: any) => {
      console.error('Error saving certificate settings:', error);
      toast({
        title: 'Gagal menyimpan pengaturan',
        description: error.message || 'Terjadi kesalahan saat menyimpan pengaturan SKL.',
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = (data: FormValues) => {
    saveSettingsMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pengaturan SKL</DialogTitle>
          <DialogDescription>
            Konfigurasi format dan konten Surat Keterangan Lulus
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {/* Certificate Header */}
                <FormField
                  control={form.control}
                  name="certHeader"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Judul SKL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Judul utama yang akan muncul pada SKL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Certificate Number Prefix */}
                <FormField
                  control={form.control}
                  name="certNumberPrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefix Nomor SKL</FormLabel>
                      <FormControl>
                        <Input placeholder="001/SKL/SMK-2025" {...field} />
                      </FormControl>
                      <FormDescription>
                        Format penomoran SKL, misal: "001/SKL/SMK-2025"
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Regulation Text */}
                <FormField
                  control={form.control}
                  name="certRegulationText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Regulasi</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Berdasarkan Peraturan Menteri..."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Teks regulasi pendidikan yang digunakan sebagai dasar SKL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Criteria Text */}
                <FormField
                  control={form.control}
                  name="certCriteriaText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Kriteria Kelulusan</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Kepala Sekolah berdasarkan ketentuan..."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Teks pengantar untuk kriteria kelulusan
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Before Student Data */}
                <FormField
                  control={form.control}
                  name="certBeforeStudentData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Sebelum Data Siswa</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Yang bertanda tangan di bawah ini..."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Teks yang tampil sebelum data siswa
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* After Student Data */}
                <FormField
                  control={form.control}
                  name="certAfterStudentData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Setelah Data Siswa</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="telah dinyatakan LULUS dari Satuan Pendidikan..."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Teks yang tampil setelah data siswa
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Certificate Footer */}
                <FormField
                  control={form.control}
                  name="certFooter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Footer SKL</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Surat ini berlaku sebagai bukti kelulusan..."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Teks penutup pada bagian bawah SKL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Academic Year */}
                  <FormField
                    control={form.control}
                    name="academicYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tahun Ajaran</FormLabel>
                        <FormControl>
                          <Input placeholder="2024/2025" {...field} />
                        </FormControl>
                        <FormDescription>
                          Format: 2024/2025
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* City Name */}
                  <FormField
                    control={form.control}
                    name="cityName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Kota</FormLabel>
                        <FormControl>
                          <Input placeholder="Jakarta" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Province Name */}
                  <FormField
                    control={form.control}
                    name="provinceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Provinsi</FormLabel>
                        <FormControl>
                          <Input placeholder="DKI Jakarta" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Graduation Date */}
                  <FormField
                    control={form.control}
                    name="graduationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal Kelulusan</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              type="date"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Tanggal rapat pleno kelulusan
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Graduation Time */}
                  <FormField
                    control={form.control}
                    name="graduationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waktu Kelulusan</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              type="time"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Waktu rapat pleno kelulusan (opsional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
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
                    'Simpan Pengaturan SKL'
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

export default CertificateSettingsModal;