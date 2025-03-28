import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Student, Settings } from '@shared/schema';
import { UserInfo, CertificateData, SubjectGrade } from '@shared/types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Loader2, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import StudentHeader from '@/components/StudentHeader';
import { Certificate } from '@/components/Certificate';
import CertificateLoading from '@/components/CertificateLoading';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import WelcomeAnimation from '@/components/WelcomeAnimation';
import * as Dialog from '@radix-ui/react-dialog';

// Define a local type for the progress callback
type ProgressCallback = (step: string, progress: number) => void;

// Format tanggal untuk lokal Indonesia
function formatDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  
  return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Mempersiapkan data sertifikat dari data siswa
function prepareCertificateData(student: Record<string, any>, showGrades: boolean = false, settings?: Record<string, any>): CertificateData {
  const today = new Date();
  const grades = showGrades ? [
    { name: "Pendidikan Agama dan Budi Pekerti", value: 87.52 },
    { name: "Pendidikan Pancasila dan Kewarganegaraan", value: 90.40 },
    { name: "Bahasa Indonesia", value: 85.04 },
    { name: "Matematika", value: 87.92 },
    { name: "Sejarah Indonesia", value: 87.52 },
    { name: "Bahasa Inggris", value: 86.04 },
    { name: "Seni Budaya", value: 89.28 },
    { name: "Pendidikan Jasmani, Olah Raga, dan Kesehatan", value: 91.92 },
    { name: "Prakarya dan Kewirausahaan", value: 91.20 },
    { name: "Matematika Peminatan", value: 85.32 },
    { name: "Biologi", value: 88.56 },
    { name: "Fisika", value: 87.64 },
    { name: "Kimia", value: 88.60 },
    { name: "Sosiologi Peminatan", value: 89.04 }
  ] : undefined;
  
  const averageGrade = grades 
    ? Number((grades.reduce((sum, grade) => sum + grade.value, 0) / grades.length).toFixed(2)) 
    : undefined;
  
  // Menghasilkan nomor sertifikat
  const generateCertificateNumber = (studentId: number): string => {
    // Hanya menggunakan nomor urut siswa yang diformat
    const formattedId = String(studentId).padStart(3, '0');
    return formattedId;
  };
  
  return {
    id: student.id,
    nisn: student.nisn,
    nis: student.nis,
    fullName: student.fullName,
    birthPlace: student.birthPlace,
    birthDate: student.birthDate,
    parentName: student.parentName,
    className: student.className,
    certNumber: generateCertificateNumber(student.id),
    certNumberPrefix: settings?.certNumberPrefix || "",
    certBeforeStudentData: settings?.certBeforeStudentData || "Yang bertanda tangan di bawah ini, Kepala Sekolah Menengah Atas, menerangkan bahwa:",
    certAfterStudentData: settings?.certAfterStudentData || "telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan.",
    certRegulationText: settings?.certRegulationText || "",
    certCriteriaText: settings?.certCriteriaText || "",
    issueDate: formatDate(today.toISOString()),
    graduationDate: settings?.graduationDate || "05 Mei 2025",
    graduationTime: settings?.graduationTime || "",
    headmasterName: settings?.headmasterName || "Efriedi, S.Pd, MM",
    headmasterNip: settings?.headmasterNip || "196611011991031005",
    headmasterSignature: settings?.headmasterSignature || "",
    schoolName: settings?.schoolName || "SMA Negeri 1 Dua Koto",
    schoolAddress: settings?.schoolAddress || "Jl. Pendidikan No. 1",
    schoolEmail: settings?.schoolEmail || "",
    schoolWebsite: settings?.schoolWebsite || "",
    schoolLogo: settings?.schoolLogo || "",
    schoolStamp: settings?.schoolStamp || "",
    ministryLogo: settings?.ministryLogo || "",
    cityName: settings?.cityName || "KAB. PASAMAN",
    provinceName: settings?.provinceName || "Sumatera Barat",
    academicYear: settings?.academicYear || "2024/2025",
    majorName: "MIPA",
    showGrades,
    grades,
    averageGrade
  };
}

// Fungsi untuk menghasilkan PDF dari element
async function generatePdf(
  elementId: string, 
  filename: string, 
  onProgress?: ((step: string, progress: number) => void) | undefined
): Promise<void> {
  try {
    // Report initial progress
    onProgress && onProgress('Memulai proses', 5);
    
    console.log(`Generating PDF for element with ID: ${elementId}`);
    
    // Berikan waktu untuk update DOM dan penemuan elemen
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID "${elementId}" not found`);
      throw new Error(`Element with ID "${elementId}" not found`);
    }
    
    // Log element properties untuk debugging
    console.log(`Element found: ${element.tagName}, Width: ${element.offsetWidth}, Height: ${element.offsetHeight}`);
    
    // Pendekatan sederhana: tangkap langsung saja
    onProgress && onProgress('Menyiapkan elemen sertifikat', 20);
    
    // Pendekatan baru: Ambil screenshot langsung dari elemen asli
    // dengan opsi yang disederhanakan
    const options = {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF', 
      scrollX: 0,
      scrollY: 0,
      windowWidth: undefined,
      windowHeight: undefined
    };
    
    // Progress: Mulai render
    onProgress && onProgress('Membuat gambar sertifikat', 40);
    
    // Langsung render dari elemen asli
    const canvas = await html2canvas(element, options);
    console.log('Canvas created successfully:', canvas.width, 'x', canvas.height);
    
    // Progress: Render canvas selesai
    onProgress && onProgress('Mengoptimasi gambar', 60);
    
    // Jika canvas berhasil dibuat, konversi ke gambar
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    
    // Coba pendekatan paling sederhana dulu: unduh saja sebagai gambar
    if (filename.endsWith('.pdf')) {
      // Progress: Optimasi selesai
      onProgress && onProgress('Membuat file PDF', 70);
      
      // Buat file PDF dengan ukuran A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      // A4 dimensions
      const a4Width = 210;  // width in mm
      const a4Height = 297; // height in mm
      
      // Hitung rasio untuk menyesuaikan gambar
      const imgRatio = canvas.width / canvas.height;
      
      // Sesuaikan dimensi gambar agar fit di halaman PDF (skala penuh)
      let imgWidth = a4Width;
      let imgHeight = imgWidth / imgRatio;
      
      // Jika tinggi lebih dari halaman A4, skala berdasarkan tinggi
      if (imgHeight > a4Height) {
        imgHeight = a4Height;
        imgWidth = imgHeight * imgRatio;
      }
      
      // Progress: Persiapan PDF
      onProgress && onProgress('Memasukkan gambar ke PDF', 80);
      
      // Posisikan gambar di tengah halaman
      const xOffset = (a4Width - imgWidth) / 2;
      const yOffset = (a4Height - imgHeight) / 2;
      
      // Tambahkan gambar ke PDF
      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
      
      // Progress: Siap untuk save
      onProgress && onProgress('Menyimpan file PDF', 90);
      
      // Simpan PDF
      pdf.save(filename);
    } else {
      // Langsung simpan sebagai gambar jika bukan PDF
      const a = document.createElement('a');
      a.href = imgData;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    // Progress: Selesai
    onProgress && onProgress('Berhasil membuat sertifikat', 100);
    console.log('Sertifikat berhasil dibuat', filename);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error generating certificate:', error);
    onProgress && onProgress('Terjadi kesalahan saat membuat sertifikat', 100);
    
    // Sebagai fallback langsung ke JPG saja
    try {
      onProgress && onProgress('Mencoba unduh sebagai gambar (JPG)', 50);
      
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found for fallback method');
      }
      
      // Opsi yang lebih sederhana, fokus pada kualitas gambar 
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF'
      });
      
      onProgress && onProgress('Gambar berhasil dibuat, menyiapkan download', 75);
      
      // Konversi ke gambar dengan nama yang sesuai
      const imgData = canvas.toDataURL('image/jpeg', 0.95); // Quality 95%
      
      // Buat link download
      const a = document.createElement('a');
      a.href = imgData;
      a.download = filename.replace('.pdf', '.jpg');
      document.body.appendChild(a);
      
      // Klik link untuk memulai download
      onProgress && onProgress('Menyimpan gambar sertifikat', 90);
      a.click();
      
      // Hapus link setelah download dimulai
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      
      onProgress && onProgress('Berhasil membuat gambar sertifikat', 100);
    } catch (fallbackError) {
      console.error('Fallback method failed:', fallbackError);
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
}

export default function StudentDashboard() {
  const { updateWelcomeStatus } = useAuth();
  const [user, setUser] = useState<UserInfo | null>(null);
  const { toast } = useToast();
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [showCertificatePopup, setShowCertificatePopup] = useState(false);
  const [showGradesInPopup, setShowGradesInPopup] = useState(false);
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);
  const [showLoadingDialog, setShowLoadingDialog] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Define type for loading step status
  type LoadingStepStatus = 'pending' | 'loading' | 'success' | 'error';
  
  // Define steps for certificate generation process
  const loadingSteps = [
    {
      label: 'Menyiapkan elemen sertifikat',
      status: 'pending' as LoadingStepStatus,
    },
    {
      label: 'Membuat gambar sertifikat',
      status: 'pending' as LoadingStepStatus,
    },
    {
      label: 'Mengoptimasi dan mengonversi',
      status: 'pending' as LoadingStepStatus,
    },
    {
      label: 'Menyimpan file sertifikat',
      status: 'pending' as LoadingStepStatus,
    }
  ];
  
  // Fetch user data
  const { data: userData, isLoading: userLoading } = useQuery<UserInfo>({
    queryKey: ['/api/user'],
  });
  
  // Fetch student data
  const { data: student, isLoading: studentLoading } = useQuery<Student>({
    queryKey: ['/api/students/profile'],
    enabled: !!userData?.studentId,
  });
  
  // Fetch school settings
  const { data: schoolSettings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ['/api/settings'],
  });
  
  useEffect(() => {
    if (userData) {
      setUser(userData);
      // Show welcome animation for first-time users
      if (userData && !userData.hasSeenWelcome) {
        setShowWelcomeAnimation(true);
      }
    }
  }, [userData]);
  
  // Handle welcome animation close
  const handleWelcomeClose = async () => {
    try {
      setShowWelcomeAnimation(false);
      // Update welcome status in the database
      await updateWelcomeStatus(true);
    } catch (error) {
      console.error('Failed to update welcome status:', error);
    }
  };
  
  useEffect(() => {
    if (student && student.status === 'verified') {
      // Secara default tidak menunjukkan nilai
      const certData = prepareCertificateData(student);
      if (certData && schoolSettings) {
        // Update dengan pengaturan sekolah
        certData.schoolName = schoolSettings.schoolName || certData.schoolName;
        certData.schoolAddress = schoolSettings.schoolAddress || certData.schoolAddress;
        certData.schoolEmail = schoolSettings.schoolEmail || certData.schoolEmail;
        certData.schoolWebsite = schoolSettings.schoolWebsite || certData.schoolWebsite;
        certData.schoolLogo = schoolSettings.schoolLogo || certData.schoolLogo;
        certData.ministryLogo = schoolSettings.ministryLogo || certData.ministryLogo;
        certData.headmasterName = schoolSettings.headmasterName || certData.headmasterName;
        certData.headmasterNip = schoolSettings.headmasterNip || certData.headmasterNip;
        certData.headmasterSignature = schoolSettings.headmasterSignature || certData.headmasterSignature;
        certData.schoolStamp = schoolSettings.schoolStamp || certData.schoolStamp;
        certData.cityName = schoolSettings.cityName || certData.cityName;
        certData.provinceName = schoolSettings.provinceName || certData.provinceName;
        certData.academicYear = schoolSettings.academicYear || certData.academicYear;
        certData.showGrades = false;
        certData.certNumberPrefix = schoolSettings.certNumberPrefix || certData.certNumberPrefix;
        certData.certBeforeStudentData = schoolSettings.certBeforeStudentData || certData.certBeforeStudentData;
        certData.certAfterStudentData = schoolSettings.certAfterStudentData || certData.certAfterStudentData;
        certData.certRegulationText = schoolSettings.certRegulationText || certData.certRegulationText;
        certData.certCriteriaText = schoolSettings.certCriteriaText || certData.certCriteriaText;
        certData.graduationDate = schoolSettings.graduationDate || certData.graduationDate;
        certData.graduationTime = schoolSettings.graduationTime || certData.graduationTime;
      }
      setCertificateData(certData);
    }
  }, [student, schoolSettings]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      // Use React-friendly navigation instead of direct window location
      setUser(null);
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Fungsi untuk mengunduh SKL dengan atau tanpa nilai
  const handleDownloadSKL = (withGrades: boolean) => {
    if (!certificateData) return;
    
    // Update certificate data to show/hide grades
    setCertificateData({...certificateData, showGrades: withGrades});
    
    const filename = withGrades 
      ? `SKL_Dengan_Nilai_${certificateData.nisn}.pdf` 
      : `SKL_Tanpa_Nilai_${certificateData.nisn}.pdf`;
      
    // Verifikasi elemen yang akan digunakan untuk PDF
    console.log("Memeriksa elemen untuk PDF...");
    setTimeout(() => {
      const container = document.getElementById('certificate-download-container');
      console.log("Container exists:", !!container);
      if (container) {
        console.log("Container dimensions:", container.offsetWidth, "x", container.offsetHeight);
        console.log("Container visibility:", window.getComputedStyle(container.parentElement as Element).display);
      }
    }, 50);
    
    // Reset the loading dialog state
    setLoadingProgress(0);
    setCurrentStep(0);
    setLoadingError(null);
    setLoadingStep('');
    
    // Update steps to pending
    const updatedSteps = loadingSteps.map(step => ({
      ...step,
      status: 'pending' as LoadingStepStatus
    }));
    
    // Show loading dialog
    setShowLoadingDialog(true);
    
    // Slight delay to ensure state update is applied
    setTimeout(() => {
      try {
        // Start tracking progress, update steps
        const handleProgress = (step: string, progress: number) => {
          setLoadingStep(step);
          setLoadingProgress(progress);
          
          // Find step index
          if (progress <= 30) {
            setCurrentStep(0);
            updatedSteps[0].status = 'loading' as LoadingStepStatus;
          } else if (progress <= 60) {
            setCurrentStep(1);
            updatedSteps[0].status = 'success' as LoadingStepStatus;
            updatedSteps[1].status = 'loading' as LoadingStepStatus;
          } else if (progress <= 90) {
            setCurrentStep(2);
            updatedSteps[0].status = 'success' as LoadingStepStatus;
            updatedSteps[1].status = 'success' as LoadingStepStatus;
            updatedSteps[2].status = 'loading' as LoadingStepStatus;
          } else {
            setCurrentStep(3);
            updatedSteps[0].status = 'success' as LoadingStepStatus;
            updatedSteps[1].status = 'success' as LoadingStepStatus;
            updatedSteps[2].status = 'success' as LoadingStepStatus;
            updatedSteps[3].status = 'loading' as LoadingStepStatus;
            
            if (progress === 100) {
              updatedSteps[3].status = 'success' as LoadingStepStatus;
            }
          }
        };
        
        // Panggil generatePdf dengan container ID yang benar
        generatePdf('certificate-download-container', filename, handleProgress)
          .then(() => {
            // Wait a moment to show the success state
            setTimeout(() => {
              // Hide loading dialog
              setShowLoadingDialog(false);
              
              toast({
                title: "Success",
                description: `SKL ${withGrades ? 'dengan nilai' : 'tanpa nilai'} berhasil diunduh`,
              });
            }, 1000);
          })
          .catch((error: any) => {
            // Show error in dialog
            setLoadingError("Terjadi kesalahan saat mengunduh SKL. Silakan coba lagi.");
            
            // Mark current step as error
            if (currentStep < updatedSteps.length) {
              updatedSteps[currentStep].status = 'error' as LoadingStepStatus;
            }
            
            toast({
              title: "Error",
              description: "Gagal mengunduh SKL",
              variant: "destructive",
            });
            console.error(error);
          });
      } catch (error) {
        // Show error in dialog
        console.error("Error dalam proses mengunduh:", error);
        setLoadingError("Terjadi kesalahan saat memproses SKL. Silakan coba lagi.");
        
        // Mark current step as error
        if (currentStep < updatedSteps.length) {
          updatedSteps[currentStep].status = 'error' as LoadingStepStatus;
        }
        
        toast({
          title: "Error",
          description: "Gagal memproses SKL",
          variant: "destructive",
        });
      }
    }, 100);
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
      {showWelcomeAnimation && user && (
        <WelcomeAnimation user={user} onClose={handleWelcomeClose} />
      )}
      <StudentHeader user={user} onLogout={handleLogout} />
      
      <div>
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold">Dashboard Siswa</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
          {/* Student Information */}
          <div className="md:col-span-4">
            <Card className="mb-4 sm:mb-6">
              <CardContent className="p-4 sm:p-6">
                <div className="text-center mb-3 sm:mb-4">
                  <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 mb-3 sm:mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  
                  {studentLoading ? (
                    <div className="flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : student ? (
                    <>
                      <h3 className="text-base sm:text-lg font-semibold">{student.fullName}</h3>
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
                      <span className="font-medium">{student.birthPlace}, {formatDate(student.birthDate)}</span>
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
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">{student.verificationDate ? formatDate(student.verificationDate) : ''}</p>
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
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">SKL Anda sedang menunggu verifikasi dari admin.</p>
                      </div>
                    </div>
                  </div>
                ) : student?.status === 'rejected' ? (
                  <div className="p-3 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-md border-l-4 border-red-500">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700 dark:text-red-300">SKL Anda tidak dapat diverifikasi. Hubungi pihak sekolah untuk informasi lebih lanjut.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada notifikasi terbaru.</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Certificate Preview & Downloads */}
          <div className="md:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle>Surat Keterangan Lulus (SKL)</CardTitle>
              </CardHeader>
              <CardContent>
                {student?.status === 'verified' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Surat Keterangan Lulus (SKL) Anda sudah tersedia untuk diunduh. Terdapat dua format SKL yang dapat Anda unduh:
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button 
                        onClick={() => handleDownloadSKL(false)}
                        className="flex items-center justify-center gap-2"
                        size="lg"
                      >
                        <FileText className="h-5 w-5" />
                        SKL Tanpa Nilai
                      </Button>
                      <Button 
                        onClick={() => handleDownloadSKL(true)}
                        className="flex items-center justify-center gap-2"
                        variant="outline"
                        size="lg"
                      >
                        <FileText className="h-5 w-5" />
                        SKL Dengan Nilai
                      </Button>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        onClick={() => {
                          setShowGradesInPopup(false);
                          setShowCertificatePopup(true);
                        }}
                        className="w-full"
                        variant="secondary"
                      >
                        Tampilkan Pratinjau SKL
                      </Button>
                    </div>
                  </div>
                ) : student?.status === 'pending' ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                    <p className="text-gray-600 dark:text-gray-400">SKL Anda masih dalam proses verifikasi. Harap bersabar.</p>
                  </div>
                ) : student?.status === 'rejected' ? (
                  <div className="text-center py-8">
                    <X className="h-12 w-12 mx-auto mb-4 text-red-500" />
                    <p className="text-gray-600 dark:text-gray-400">
                      SKL Anda tidak dapat dikeluarkan. Silakan hubungi pihak sekolah untuk informasi lebih lanjut.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">
                      Data siswa tidak tersedia atau belum diinput. Silakan hubungi pihak sekolah.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Instruction Card */}
            <Card className="mt-4 sm:mt-6">
              <CardHeader>
                <CardTitle>Petunjuk Penggunaan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">1. Unduh SKL</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pilih format SKL yang ingin Anda unduh. SKL tanpa nilai dapat digunakan untuk keperluan umum, sedangkan SKL dengan nilai mencakup detail nilai mata pelajaran.</p>
                  </div>
                  <div>
                    <p className="font-medium">2. Simpan File dengan Baik</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Simpan file SKL di tempat yang aman. Anda juga disarankan untuk mencetak sebagai cadangan fisik.</p>
                  </div>
                  <div>
                    <p className="font-medium">3. Verifikasi Kelengkapan</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pastikan semua data di SKL sudah lengkap dan benar. Jika ada ketidaksesuaian, segera hubungi pihak sekolah.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Hidden container for PDF download */}
      <div className="hidden">
        <div id="certificate-download-container">
          {certificateData && <Certificate data={certificateData} />}
        </div>
      </div>
      
      {/* Popup Dialog for Certificate Preview */}
      <Dialog.Root open={showCertificatePopup} onOpenChange={setShowCertificatePopup}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[90vw] md:w-[80vw] max-w-[1200px] translate-x-[-50%] translate-y-[-50%] rounded-md bg-white dark:bg-gray-900 p-4 shadow-lg z-50 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <Dialog.Title className="text-lg font-semibold">
                Pratinjau Surat Keterangan Lulus
              </Dialog.Title>
              <Dialog.Close className="rounded-full h-8 w-8 flex items-center justify-center">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
            <Separator className="mb-4" />
            
            <div className="flex-1 overflow-hidden">
              {certificateData && (
                <Certificate 
                  data={{...certificateData, showGrades: showGradesInPopup}}
                  showDownloadButton={false} 
                />
              )}
            </div>
            
            <div className="flex justify-between mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowGradesInPopup(!showGradesInPopup)}
              >
                {showGradesInPopup ? 'Sembunyikan Nilai' : 'Tampilkan Nilai'}
              </Button>
              <Dialog.Close asChild>
                <Button variant="default">Tutup</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      
      {/* Loading Dialog for PDF Generation */}
      <Dialog.Root open={showLoadingDialog} onOpenChange={setShowLoadingDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-md bg-white dark:bg-gray-900 p-6 shadow-lg z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">
              Sedang Memproses SKL
            </Dialog.Title>
            
            <CertificateLoading 
              steps={loadingSteps}
              currentStep={currentStep}
              error={loadingError}
              onClose={() => setShowLoadingDialog(false)}
              progress={loadingProgress}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
