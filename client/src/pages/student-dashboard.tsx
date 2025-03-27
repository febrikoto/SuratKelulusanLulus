import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Student } from '@shared/schema';
import { UserInfo } from '@shared/types';
import { generatePdf, prepareCertificateData } from '@/lib/utils.tsx';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import StudentHeader from '@/components/StudentHeader';
import Certificate from '@/components/Certificate';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function StudentDashboard() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const { toast } = useToast();
  const [certificateData, setCertificateData] = useState<any | null>(null);
  
  // Fetch user data
  const { data: userData, isLoading: userLoading } = useQuery<UserInfo>({
    queryKey: ['/api/user'],
  });
  
  // Fetch student data
  const { data: student, isLoading: studentLoading } = useQuery<Student>({
    queryKey: ['/api/students/profile'],
    enabled: !!userData?.studentId,
  });
  
  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);
  
  useEffect(() => {
    if (student && student.status === 'verified') {
      setCertificateData(prepareCertificateData(student));
    }
  }, [student]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      window.location.href = '/login';
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const downloadCertificate = () => {
    if (!certificateData) return;
    
    generatePdf('certificate-container', `SKL_${certificateData.nisn}.pdf`)
      .then(() => {
        toast({
          title: "Success",
          description: "SKL berhasil diunduh",
        });
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Gagal mengunduh SKL",
          variant: "destructive",
        });
        console.error(error);
      });
  };
  
  // Loading state or redirect if not authenticated
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <StudentHeader user={user} onLogout={handleLogout} />
      
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">Dashboard Siswa</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Student Information */}
          <div className="md:col-span-4">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className="mx-auto w-24 h-24 mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  
                  {studentLoading ? (
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : student ? (
                    <>
                      <h3 className="text-lg font-semibold">{student.fullName}</h3>
                      <p className="text-gray-500 dark:text-gray-400">NISN: {student.nisn}</p>
                    </>
                  ) : (
                    <p className="text-gray-500">Data siswa tidak tersedia</p>
                  )}
                </div>
                
                {student && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Kelas:</span>
                      <span className="font-medium">{student.className}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tempat, Tanggal Lahir:</span>
                      <span className="font-medium">{student.birthPlace}, {student.birthDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Nama Orang Tua:</span>
                      <span className="font-medium">{student.parentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status SKL:</span>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${student.status === 'verified' ? 'bg-green-100 text-green-800' : 
                          student.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}>
                        {student.status === 'verified' ? 'Terverifikasi' : 
                         student.status === 'pending' ? 'Menunggu Verifikasi' : 
                         'Ditolak'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          
            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Notifikasi</CardTitle>
              </CardHeader>
              <CardContent>
                {student?.status === 'verified' ? (
                  <div className="p-3 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-md border-l-4 border-green-500">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700 dark:text-green-300">SKL Anda telah disetujui dan siap untuk diunduh.</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">{student.verificationDate ? new Date(student.verificationDate).toLocaleString() : ''}</p>
                      </div>
                    </div>
                  </div>
                ) : student?.status === 'pending' ? (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded-md border-l-4 border-yellow-500">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">SKL Anda sedang dalam proses verifikasi.</p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Harap tunggu konfirmasi dari pihak sekolah.</p>
                      </div>
                    </div>
                  </div>
                ) : student?.status === 'rejected' ? (
                  <div className="p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-md border-l-4 border-red-500">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700 dark:text-red-300">SKL Anda tidak disetujui.</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {student.verificationNotes || 'Tidak ada catatan tambahan.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-md border-l-4 border-blue-500">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700 dark:text-blue-300">Semua siswa kelas XII diharapkan mengecek data SKL.</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Hubungi admin jika ada masalah dengan data Anda.</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <Separator className="my-4" />
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-md border-l-4 border-blue-500">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">Pengumuman kelulusan tahun ajaran 2024/2025.</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">3 Mei 2024</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Certificate Preview */}
          <div className="md:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle>Surat Keterangan Lulus (SKL)</CardTitle>
              </CardHeader>
              
              <CardContent>
                {studentLoading ? (
                  <div className="flex justify-center p-10">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                ) : !student ? (
                  <div className="text-center py-10 text-gray-500">
                    Data siswa tidak tersedia
                  </div>
                ) : student.status !== 'verified' ? (
                  <div className="text-center py-10 text-gray-500">
                    {student.status === 'pending' 
                      ? 'SKL Anda sedang dalam proses verifikasi. Harap tunggu konfirmasi dari pihak sekolah.'
                      : 'SKL Anda belum dapat diakses. Silakan hubungi admin untuk informasi lebih lanjut.'}
                  </div>
                ) : certificateData ? (
                  <>
                    <div id="certificate-container">
                      <Certificate data={certificateData} />
                    </div>
                    
                    <div className="flex justify-center mt-6">
                      <Button 
                        onClick={downloadCertificate}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Unduh SKL
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    Terjadi kesalahan dalam memuat data SKL
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
