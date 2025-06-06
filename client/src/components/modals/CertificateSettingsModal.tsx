import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import TiptapEditor from '@/components/ui/tiptap/TiptapEditor';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Calendar, Clipboard, Copy as CopyIcon } from 'lucide-react';

interface CertificateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Validation schema for certificate settings form
const formSchema = z.object({
  academicYear: z.string().min(5, { message: 'Tahun ajaran wajib diisi (contoh: 2024/2025)' }),
  graduationDate: z.string().min(5, { message: 'Tanggal kelulusan wajib diisi' }),
  graduationTime: z.string().default(''),
  cityName: z.string().min(2, { message: 'Nama kota wajib diisi' }),
  provinceName: z.string().min(2, { message: 'Nama provinsi wajib diisi' }),
  certNumberPrefix: z.string().default(''),
  certHeader: z.string().default(''),
  certFooter: z.string().default(''),
  certBeforeStudentData: z.string().default(''),
  certAfterStudentData: z.string().default(''),
  certRegulationText: z.string().default(''),
  certCriteriaText: z.string().default(''),
  majorList: z.string().default('semua,MIPA,IPS,BAHASA'),
  classList: z.string().default('XII IPA 1,XII IPA 2,XII IPS 1,XII IPS 2'),
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
      academicYear: '',
      graduationDate: '',
      graduationTime: '',
      cityName: '',
      provinceName: '',
      certNumberPrefix: '',
      certHeader: '',
      certFooter: '',
      certBeforeStudentData: '',
      certAfterStudentData: '',
      certRegulationText: '',
      certCriteriaText: '',
      majorList: 'semua,MIPA,IPS,BAHASA',
      classList: 'XII IPA 1,XII IPA 2,XII IPS 1,XII IPS 2',
    },
  });
  
  // Update form values when settings data is loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        academicYear: settings.academicYear || '',
        graduationDate: settings.graduationDate || '',
        graduationTime: settings.graduationTime || '',
        cityName: settings.cityName || '',
        provinceName: settings.provinceName || '',
        certNumberPrefix: settings.certNumberPrefix || '',
        certHeader: settings.certHeader || '',
        certFooter: settings.certFooter || '',
        certBeforeStudentData: settings.certBeforeStudentData || 'Yang bertanda tangan di bawah ini, Kepala SMK Negeri 1 Lubuk Sikaping, menerangkan bahwa yang bersangkutan:',
        certAfterStudentData: settings.certAfterStudentData || 'telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan.',
        certRegulationText: settings.certRegulationText || '',
        certCriteriaText: settings.certCriteriaText || '',
        majorList: settings.majorList || 'semua,MIPA,IPS,BAHASA',
        classList: settings.classList || 'XII IPA 1,XII IPA 2,XII IPS 1,XII IPS 2',
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
        title: 'Pengaturan sertifikat berhasil disimpan',
        description: 'Konten sertifikat kelulusan telah diperbarui',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      onClose();
    },
    onError: (error: any) => {
      console.error('Error saving settings:', error);
      toast({
        title: 'Gagal menyimpan pengaturan',
        description: error.message || 'Terjadi kesalahan saat menyimpan pengaturan sertifikat. Periksa apakah semua data yang dimasukkan sudah benar.',
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = (data: FormValues) => {
    saveSettingsMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">Pengaturan Sertifikat Kelulusan</DialogTitle>
          <DialogDescription className="mt-1.5">
            Sesuaikan informasi dan konten yang akan ditampilkan pada sertifikat kelulusan
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4 max-h-[calc(90vh-160px)] overflow-y-auto px-1 sm:px-2">
              
              <div className="space-y-5">
                <div className="flex items-center space-x-2 mb-2 sticky top-0 bg-background z-10 py-2 border-b">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-md font-semibold">Informasi Kelulusan</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    
                    <FormField
                      control={form.control}
                      name="graduationTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Waktu Kelulusan</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-5 mt-6">
                <div className="flex items-center space-x-2 mb-2 sticky top-0 bg-background z-10 py-2 border-b">
                  <Clipboard className="h-5 w-5 text-primary" />
                  <h3 className="text-md font-semibold">Konten Sertifikat</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="certNumberPrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prefiks Nomor Sertifikat</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: SKL/2024/" {...field} />
                      </FormControl>
                      <FormDescription>
                        Prefiks untuk nomor sertifikat. Akan ditambahkan sebelum nomor urut siswa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="certHeader"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Judul Sertifikat</FormLabel>
                        <FormControl>
                          <Input placeholder="SURAT KETERANGAN LULUS" {...field} />
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
                          <Input placeholder="Teks footer sertifikat" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="certBeforeStudentData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Sebelum Data Siswa</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Yang bertanda tangan di bawah ini..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Contoh: "Yang bertanda tangan di bawah ini, Kepala SMK Negeri 1 Lubuk Sikaping, menerangkan bahwa yang bersangkutan:"
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="certAfterStudentData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Setelah Data Siswa</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="telah dinyatakan LULUS dari Satuan Pendidikan..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Contoh: "telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan."
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="certRegulationText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Regulasi</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Berdasarkan Peraturan Menteri..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Contoh: "Berdasarkan Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 Tahun 2022..."
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Gunakan komponen FormTiptap untuk teks kriteria kelulusan */}
                <FormItem>
                  <FormLabel>Teks Kriteria Kelulusan</FormLabel>
                  <FormControl>
                    <Controller
                      name="certCriteriaText"
                      control={form.control}
                      render={({ field: { value, onChange } }) => (
                        <TiptapEditor
                          content={value || ''}
                          onChange={onChange}
                          className="min-h-[220px]"
                        />
                      )}
                    />
                  </FormControl>
                  <FormDescription>
                    Jika diisi, teks ini akan menggantikan daftar kriteria kelulusan default. Gunakan editor di atas untuk memformat teks dan membuat daftar bernomor.
                    <div className="mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const exampleContent = `<ol style="list-style-type:decimal; padding-left:20px; text-align:left;">
  <li>Kriteria Lulus dari Satuan Pendidikan sesuai dengan peraturan perundang-undangan.</li>
  <li>Surat Kepala Dinas Pendidikan Provinsi Sumatera Barat Nomor : 400.14.4.3/1107/PSMA/DISDIK-2024 tanggal 18 April 2024 tentang Kelulusan SMA/AMK/SLB Tahun Ajaran 2024/2025.</li>
  <li>Ketuntasan dari seluruh program pembelajaran sesuai kurikulum yang berlaku, termasuk Ekstrakurikuler dan prestasi lainnya.</li>
  <li>Hasil Rapat Pleno Dewan Guru.</li>
</ol>`;
                          form.setValue('certCriteriaText', exampleContent);
                          toast({
                            title: "Contoh Diterapkan!",
                            description: "Format contoh kriteria kelulusan telah diterapkan",
                          });
                        }}
                      >
                        <CopyIcon className="h-3.5 w-3.5 mr-1" />
                        Terapkan Format Contoh
                      </Button>
                    </div>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              </div>
              
              <div className="space-y-5 mt-6">
                <div className="flex items-center space-x-2 mb-2 sticky top-0 bg-background z-10 py-2 border-b">
                  <Clipboard className="h-5 w-5 text-primary" />
                  <h3 className="text-md font-semibold">Pengaturan Jurusan & Kelas</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="majorList"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daftar Jurusan</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="semua,MIPA,IPS,BAHASA" 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Daftar jurusan yang tersedia di sekolah. Pisahkan dengan koma (,).
                        Contoh: semua,MIPA,IPS,BAHASA
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="classList"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daftar Kelas</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="XII IPA 1,XII IPA 2,XII IPS 1,XII IPS 2" 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Daftar kelas yang tersedia di sekolah. Pisahkan dengan koma (,).
                        Contoh: XII IPA 1,XII IPA 2,XII IPS 1,XII IPS 2
                      </FormDescription>
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

export default CertificateSettingsModal;