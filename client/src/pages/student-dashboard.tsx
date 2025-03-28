import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Student, Settings } from '@shared/schema';
import { UserInfo, CertificateData } from '@shared/types';
import { generatePdf, prepareCertificateData } from '@/lib/utils';

// Define a local type for the progress callback
type ProgressCallback = (step: string, progress: number) => void;
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
  const handleDownloadSKL = (withGrades: boolean, preview: boolean = true) => {
    if (!certificateData) return;
    
    // Update certificate data to show/hide grades
    setCertificateData({...certificateData, showGrades: withGrades});
    
    const filename = withGrades 
      ? `SKL_Dengan_Nilai_${certificateData.nisn}` 
      : `SKL_Tanpa_Nilai_${certificateData.nisn}`;
      
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
        generatePdf('certificate-download-container', filename, handleProgress, preview)
          .then(() => {
            // Wait a moment to show the success state
            setTimeout(() => {
              // Hide loading dialog
              setShowLoadingDialog(false);
              
              toast({
                title: "Success",
                description: preview 
                  ? `Preview SKL ${withGrades ? 'dengan nilai' : 'tanpa nilai'} berhasil ditampilkan` 
                  : `SKL ${withGrades ? 'dengan nilai' : 'tanpa nilai'} berhasil diunduh`,
              });
            }, 1000);
          })
          .catch((error) => {
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
                    <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
                      <Button 
                        onClick={() => {
                          setCertificateData((prevData: CertificateData | null) => 
                            prevData ? {...prevData, showGrades: false} : null
                          );
                          setShowGradesInPopup(false);
                          setShowCertificatePopup(true);
                        }}
                        className="bg-primary hover:bg-primary/90"
                        size="sm"
                      >
                        <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">Lihat SKL Tanpa Nilai</span>
                      </Button>
                      
                      <Button 
                        onClick={() => {
                          setCertificateData((prevData: CertificateData | null) => 
                            prevData ? {...prevData, showGrades: true} : null
                          );
                          setShowGradesInPopup(true);
                          setShowCertificatePopup(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">Lihat SKL Dengan Nilai</span>
                      </Button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-center mt-4 space-y-2 sm:space-y-0 sm:space-x-4">
                      <Button 
                        onClick={() => handleDownloadSKL(false, true)}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">Unduh SKL Tanpa Nilai</span>
                      </Button>
                      
                      <Button 
                        onClick={() => handleDownloadSKL(true, true)}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm">Unduh SKL Dengan Nilai</span>
                      </Button>
                    </div>
                    
                    {/* Certificate Popup Dialog */}
                    <Dialog.Root open={showCertificatePopup} onOpenChange={setShowCertificatePopup}>
                      <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[900px] translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-900 rounded-lg p-2 sm:p-4 shadow-lg z-50 overflow-y-auto">
                          <div className="flex justify-between items-center mb-2 sm:mb-4">
                            <Dialog.Title className="text-lg sm:text-xl font-semibold">
                              {showGradesInPopup ? 'SKL Dengan Nilai' : 'SKL Tanpa Nilai'}
                            </Dialog.Title>
                            <Dialog.Close asChild>
                              <button className="rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            </Dialog.Close>
                          </div>
                          <Dialog.Description className="sr-only">
                            Tampilan sertifikat kelulusan {showGradesInPopup ? 'dengan nilai' : 'tanpa nilai'}
                          </Dialog.Description>
                          <div id="certificate-popup-container" className="overflow-y-auto max-h-[calc(85vh-100px)]">
                            <Certificate data={certificateData} />
                          </div>
                          <div className="flex justify-center mt-4 sm:mt-6">
                            <Button 
                              onClick={() => handleDownloadSKL(showGradesInPopup, true)}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                              <span className="text-xs sm:text-sm">Unduh SKL {showGradesInPopup ? 'Dengan Nilai' : 'Tanpa Nilai'}</span>
                            </Button>
                          </div>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>
                    
                    {/* Elemen untuk download PDF - gunakan visibility:hidden daripada display:none */}
                    <div className="absolute opacity-0 pointer-events-none" style={{
                      position: 'absolute',
                      left: '-9999px',
                      width: '215mm',
                      height: 'auto',
                      visibility: 'visible'
                    }}>
                      <div id="certificate-download-container" className="certificate-container-wrapper bg-white">
                        <Certificate data={certificateData} />
                      </div>
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
      
      {/* Loading Dialog */}
      <Dialog.Root open={showLoadingDialog} onOpenChange={setShowLoadingDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-900 rounded-lg shadow-lg z-50 overflow-y-auto">
            <Dialog.Title className="sr-only">
              Proses Pembuatan Sertifikat
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Dialog progres pembuatan sertifikat kelulusan
            </Dialog.Description>
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
