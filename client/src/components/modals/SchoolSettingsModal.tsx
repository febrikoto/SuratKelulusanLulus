import React, { useState, useEffect, useRef } from 'react';
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
import { Loader2, School, Calendar, Clock, FileImage, Upload, Clipboard } from 'lucide-react';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Validation schema for school settings form
const formSchema = z.object({
  schoolName: z.string().min(3, { message: 'Nama sekolah wajib diisi (minimal 3 karakter)' }),
  schoolAddress: z.string().min(5, { message: 'Alamat sekolah wajib diisi (minimal 5 karakter)' }),
  schoolLogo: z.string().default(''),
  ministryLogo: z.string().default(''),
  headmasterName: z.string().min(3, { message: 'Nama kepala sekolah wajib diisi' }),
  headmasterNip: z.string().min(5, { message: 'NIP kepala sekolah wajib diisi' }),
  headmasterSignature: z.string().default(''),
  schoolStamp: z.string().default(''),
  certHeader: z.string().default(''),
  certFooter: z.string().default(''),
  certBeforeStudentData: z.string().default('Yang bertanda tangan di bawah ini, Kepala SMK Negeri 1 Lubuk Sikaping, menerangkan bahwa yang bersangkutan:'),
  certAfterStudentData: z.string().default('telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan.'),
  certNumberPrefix: z.string().default(''),
  certRegulationText: z.string().default(''),
  certCriteriaText: z.string().default(''),
  academicYear: z.string().min(5, { message: 'Tahun ajaran wajib diisi (contoh: 2024/2025)' }),
  graduationDate: z.string().min(5, { message: 'Tanggal kelulusan wajib diisi' }),
  graduationTime: z.string().default(''),
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
  
  // File upload references
  const schoolLogoFileRef = useRef<HTMLInputElement>(null);
  const ministryLogoFileRef = useRef<HTMLInputElement>(null);
  const headmasterSignatureFileRef = useRef<HTMLInputElement>(null);
  const schoolStampFileRef = useRef<HTMLInputElement>(null);
  
  // Form hook
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: '',
      schoolAddress: '',
      schoolLogo: '',
      ministryLogo: '',
      headmasterName: '',
      headmasterNip: '',
      headmasterSignature: '',
      schoolStamp: '',
      certHeader: '',
      certFooter: '',
      certBeforeStudentData: '',
      certAfterStudentData: '',
      certNumberPrefix: '',
      certRegulationText: '',
      certCriteriaText: '',
      academicYear: '',
      graduationDate: '',
      graduationTime: '',
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
        ministryLogo: settings.ministryLogo || '',
        headmasterName: settings.headmasterName || '',
        headmasterNip: settings.headmasterNip || '',
        headmasterSignature: settings.headmasterSignature || '',
        schoolStamp: settings.schoolStamp || '',
        certHeader: settings.certHeader || '',
        certFooter: settings.certFooter || '',
        certBeforeStudentData: settings.certBeforeStudentData || 'Yang bertanda tangan di bawah ini, Kepala SMK Negeri 1 Lubuk Sikaping, menerangkan bahwa yang bersangkutan:',
        certAfterStudentData: settings.certAfterStudentData || 'telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan.',
        certNumberPrefix: settings.certNumberPrefix || '',
        certRegulationText: settings.certRegulationText || '',
        certCriteriaText: settings.certCriteriaText || '',
        academicYear: settings.academicYear || '',
        graduationDate: settings.graduationDate || '',
        graduationTime: settings.graduationTime || '',
        cityName: settings.cityName || '',
        provinceName: settings.provinceName || '',
      });
    }
  }, [settings, form]);
  
  // Handle file uploads
  const handleFileUpload = (ref: React.RefObject<HTMLInputElement>, fieldName: keyof FormValues) => {
    if (ref.current?.files && ref.current.files.length > 0) {
      const file = ref.current.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          form.setValue(fieldName, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
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
    onError: (error: any) => {
      console.error('Error saving settings:', error);
      toast({
        title: 'Gagal menyimpan pengaturan',
        description: error.message || 'Terjadi kesalahan saat menyimpan pengaturan sekolah. Periksa apakah semua data yang dimasukkan sudah benar.',
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = (data: FormValues) => {
    saveSettingsMutation.mutate(data);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg max-h-[90vh] overflow-hidden">
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4 max-h-[75vh] overflow-y-auto px-1">
              <div className="space-y-5">
                <div className="flex items-center space-x-2 mb-2 sticky top-0 bg-background z-10 py-2 border-b">
                  <School className="h-5 w-5 text-primary" />
                  <h3 className="text-md font-semibold">Informasi Sekolah</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
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
                  
                  <FormField
                    control={form.control}
                    name="schoolEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Sekolah</FormLabel>
                        <FormControl>
                          <Input placeholder="Email sekolah" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="schoolWebsite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website Sekolah</FormLabel>
                        <FormControl>
                          <Input placeholder="Website sekolah" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
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
                
                {/* Logo sekolah upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="schoolLogo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo Sekolah</FormLabel>
                        <div className="flex items-center gap-2">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={schoolLogoFileRef}
                            onChange={() => handleFileUpload(schoolLogoFileRef, 'schoolLogo')}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => schoolLogoFileRef.current?.click()}
                            className="w-full"
                          >
                            <FileImage className="mr-2 h-4 w-4" />
                            Pilih Logo Sekolah
                          </Button>
                        </div>
                        {field.value && (
                          <div className="mt-2 relative w-16 h-16 border rounded overflow-hidden">
                            <img src={field.value} alt="Logo Sekolah" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="ministryLogo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo Kementerian</FormLabel>
                        <div className="flex items-center gap-2">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={ministryLogoFileRef}
                            onChange={() => handleFileUpload(ministryLogoFileRef, 'ministryLogo')}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => ministryLogoFileRef.current?.click()}
                            className="w-full"
                          >
                            <FileImage className="mr-2 h-4 w-4" />
                            Pilih Logo Kementerian
                          </Button>
                        </div>
                        {field.value && (
                          <div className="mt-2 relative w-16 h-16 border rounded overflow-hidden">
                            <img src={field.value} alt="Logo Kementerian" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Tanda tangan kepsek dan stempel sekolah upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="headmasterSignature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanda Tangan Kepala Sekolah</FormLabel>
                        <div className="flex items-center gap-2">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={headmasterSignatureFileRef}
                            onChange={() => handleFileUpload(headmasterSignatureFileRef, 'headmasterSignature')}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => headmasterSignatureFileRef.current?.click()}
                            className="w-full"
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Pilih Tanda Tangan
                          </Button>
                        </div>
                        {field.value && (
                          <div className="mt-2 relative w-24 h-16 border rounded overflow-hidden">
                            <img src={field.value} alt="Tanda Tangan" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="schoolStamp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stempel Sekolah</FormLabel>
                        <div className="flex items-center gap-2">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={schoolStampFileRef}
                            onChange={() => handleFileUpload(schoolStampFileRef, 'schoolStamp')}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => schoolStampFileRef.current?.click()}
                            className="w-full"
                          >
                            <FileImage className="mr-2 h-4 w-4" />
                            Pilih Stempel
                          </Button>
                        </div>
                        {field.value && (
                          <div className="mt-2 relative w-16 h-16 border rounded overflow-hidden">
                            <img src={field.value} alt="Stempel Sekolah" className="w-full h-full object-contain" />
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="space-y-5 mt-6">
                <div className="flex items-center space-x-2 mb-2 sticky top-0 bg-background z-10 py-2 border-b">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-md font-semibold">Informasi Kelulusan</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                
                <div className="grid grid-cols-1 gap-4">
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

                <FormField
                  control={form.control}
                  name="certBeforeStudentData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Sebelum Data Siswa</FormLabel>
                      <FormControl>
                        <Input placeholder="Teks yang akan ditampilkan sebelum data siswa" {...field} />
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
                        <Input placeholder="Teks yang akan ditampilkan setelah data siswa" {...field} />
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
                      <FormLabel>Teks Peraturan/Regulasi</FormLabel>
                      <FormControl>
                        <textarea 
                          placeholder="Peraturan atau regulasi yang menjadi dasar kelulusan" 
                          className="flex h-[80px] min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                <FormField
                  control={form.control}
                  name="certCriteriaText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teks Kriteria Kelulusan</FormLabel>
                      <FormControl>
                        <textarea 
                          placeholder="Kriteria dan ketentuan kelulusan" 
                          className="flex h-[80px] min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Contoh: "Kepala SMKN 1 LUBUK SIKAPING berdasarkan ketentuan yang berlaku mempertimbangan kelulusan peserta didik pada Tahun Pelajaran 2024/2025, diantaranya sebagai berikut: ..."
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

export default SchoolSettingsModal;