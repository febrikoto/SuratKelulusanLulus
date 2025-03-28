import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Student, Settings } from '@shared/schema';
import { UserInfo, CertificateData } from '@shared/types';
import { generatePdf, prepareCertificateData } from '../lib/utils';

// Define a local type for the progress callback
type ProgressCallback = (step: string, progress: number) => void;
import { Download, Loader2, FileText, X, LayoutDashboard, GraduationCap, BookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StudentHeader } from '@/components/StudentHeader';
import { Certificate } from '@/components/Certificate';
import { CertificateLoading } from '@/components/CertificateLoading';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { WelcomeAnimation } from '@/components/WelcomeAnimation';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatedTabs, AnimatedTabsList, AnimatedTabsTrigger, AnimatedTabsContent } from '@/components/ui/animated-tabs';

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
  const [activeTab, setActiveTab] = useState('dashboard');
  
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
        
        // Panggil generatePdf dengan container ID yang benar dan parameter yang sesuai
        generatePdf(
          'certificate-download-container', 
          filename, 
          handleProgress, // progress callback
          preview // boolean untuk menentukan apakah hanya preview atau download
        )
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
        
        <AnimatedTabs value={activeTab} onValueChange={setActiveTab}>
          <AnimatedTabsList className="mb-6">
            <AnimatedTabsTrigger 
              value="dashboard" 
              icon={<LayoutDashboard className="w-4 h-4" />}
              activeColor="bg-blue-500">
              Dashboard
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="nilai" 
              icon={<GraduationCap className="w-4 h-4" />}
              activeColor="bg-green-500">
              Nilai
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger 
              value="mata-pelajaran" 
              icon={<BookText className="w-4 h-4" />}
              activeColor="bg-purple-500">
              Mata Pelajaran
            </AnimatedTabsTrigger>
          </AnimatedTabsList>
          
          <AnimatedTabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
              {/* Student Information */}
              <div className="md:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informasi Siswa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {studentLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : student ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">{student.fullName}</h3>
                            <p className="text-sm text-muted-foreground">
                              NISN: {student.nisn} | NIS: {student.nis}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <p className="text-sm font-medium">Kelas</p>
                            <p className="text-sm text-muted-foreground">{student.className}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Tempat, Tanggal Lahir</p>
                            <p className="text-sm text-muted-foreground">
                              {student.birthPlace}, {new Date(student.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Nama Orang Tua</p>
                            <p className="text-sm text-muted-foreground">{student.parentName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Status Verifikasi</p>
                            <div className="flex items-center mt-1">
                              {student.status === 'verified' ? (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                  Terverifikasi
                                </span>
                              ) : student.status === 'rejected' ? (
                                <span className="px-2 py-1 text-xs rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                  Ditolak
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">
                                  Menunggu Verifikasi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p>Tidak ada data siswa.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Certificate Preview */}
              <div className="md:col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Surat Keterangan Lulus</CardTitle>
                    <CardContent className="p-0">
                      {student?.status === 'verified' ? (
                        <div className="space-y-4 pt-4">
                          <p className="text-sm text-muted-foreground">
                            Anda telah dinyatakan <span className="font-medium text-green-600 dark:text-green-400">LULUS</span>. 
                            Silahkan unduh Surat Keterangan Lulus (SKL) sebagai bukti kelulusan.
                          </p>
                          
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                              variant="default" 
                              className="bg-primary"
                              onClick={() => {
                                setShowGradesInPopup(false);
                                setShowCertificatePopup(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Lihat SKL Tanpa Nilai
                            </Button>
                            <Button 
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setShowGradesInPopup(true);
                                setShowCertificatePopup(true);
                              }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Lihat SKL Dengan Nilai
                            </Button>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                              variant="outline" 
                              onClick={() => handleDownloadSKL(false, false)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Unduh SKL Tanpa Nilai
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handleDownloadSKL(true, false)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Unduh SKL Dengan Nilai
                            </Button>
                          </div>
                        </div>
                      ) : student?.status === 'rejected' ? (
                        <div className="bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200 p-4 rounded-md mt-4">
                          <p className="flex items-center">
                            <X className="h-5 w-5 mr-2" />
                            Maaf, status kelulusan Anda ditolak.
                          </p>
                          <p className="mt-2 text-sm">
                            Alasan: {student.verificationNotes || "Tidak ada keterangan."}
                          </p>
                          <p className="mt-2 text-sm">
                            Silahkan hubungi administrator untuk informasi lebih lanjut.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 p-4 rounded-md mt-4">
                          <p>Status kelulusan Anda masih dalam proses verifikasi.</p>
                          <p className="mt-2 text-sm">
                            Silahkan periksa kembali nanti untuk melihat status kelulusan Anda.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </AnimatedTabsContent>
          
          <AnimatedTabsContent value="nilai">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Nilai</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Fitur daftar nilai sedang dalam pengembangan</p>
              </CardContent>
            </Card>
          </AnimatedTabsContent>
          
          <AnimatedTabsContent value="mata-pelajaran">
            <Card>
              <CardHeader>
                <CardTitle>Mata Pelajaran</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Fitur mata pelajaran sedang dalam pengembangan</p>
              </CardContent>
            </Card>
          </AnimatedTabsContent>
        </AnimatedTabs>
        
        {/* Hidden container for certificate download */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0 }} id="certificate-download-container">
          {certificateData && <Certificate data={certificateData} />}
        </div>
        
        {/* Certificate Loading Dialog */}
        {showLoadingDialog && (
          <Dialog.Root open={showLoadingDialog} onOpenChange={setShowLoadingDialog}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full dark:bg-gray-900">
                <Dialog.Title className="text-lg font-semibold mb-4">
                  Mengunduh SKL
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
        )}
        
        {/* Certificate Preview Dialog */}
        {showCertificatePopup && certificateData && (
          <Dialog.Root open={showCertificatePopup} onOpenChange={setShowCertificatePopup}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[95vw] max-w-5xl translate-x-[-50%] translate-y-[-50%] overflow-auto rounded-lg bg-white shadow-lg focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] dark:bg-gray-900">
                <div className="p-4 flex justify-between items-center border-b">
                  <Dialog.Title className="text-lg font-semibold">
                    Preview {showGradesInPopup ? 'SKL dengan Nilai' : 'SKL tanpa Nilai'}
                  </Dialog.Title>
                  <Dialog.Close className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <X className="h-5 w-5" />
                  </Dialog.Close>
                </div>
                <div className="p-4 overflow-auto">
                  <Certificate data={{...certificateData, showGrades: showGradesInPopup}} />
                </div>
                <div className="p-4 border-t flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCertificatePopup(false)}
                  >
                    Tutup
                  </Button>
                  <Button 
                    onClick={() => handleDownloadSKL(showGradesInPopup, false)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Unduh
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </div>
    </div>
  );
}
