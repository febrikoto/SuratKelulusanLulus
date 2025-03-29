import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Student } from '@shared/schema';
import { DashboardStats, UserInfo, CertificateData } from '@shared/types';
import { Loader2, Search, Eye, CheckCircle, XCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import TeacherHeader from '@/components/TeacherHeader';
import { Certificate } from '@/components/Certificate';
import WelcomeAnimation from '@/components/WelcomeAnimation';
import { prepareCertificateData } from '@/lib/utils.tsx';

// Added LoadingScreen component -  This is an assumption based on the context.
const LoadingScreen = ({ message, minDelay = 300 }: { message: string; minDelay?: number }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, minDelay);

    return () => clearTimeout(timeoutId);
  }, [minDelay]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">{message}</p>
      </div>
    );
  }
  return null; // or return <></>;
};


export default function TeacherDashboard(): React.JSX.Element {
  const { user: authUser, updateWelcomeStatus } = useAuth();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(undefined);
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [verificationNote, setVerificationNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [showGrades, setShowGrades] = useState(false);
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user data
  const { data: userData, isLoading: userLoading } = useQuery<UserInfo>({
    queryKey: ['/api/user'],
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

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  // Fetch students
  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  // Fetch school settings
  const { data: schoolSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/settings'],
  });

  const pendingStudents = students
    ? students.filter(student => student.status === 'pending')
    : [];

  const filteredStudents = pendingStudents.filter(student => 
    searchTerm === '' ||
    student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.nisn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const viewStudentDetails = (id: number) => {
    setSelectedStudentId(id);
    setShowStudentDetailModal(true);
  };

  const openVerificationModal = (id: number) => {
    setSelectedStudentId(id);
    setShowVerificationModal(true);
  };

  const openRejectionModal = (id: number) => {
    setSelectedStudentId(id);
    setShowRejectionModal(true);
  };

  const openCertificatePreview = (student: Student) => {
    const certData = prepareCertificateData(student, showGrades, schoolSettings);
    setCertificateData(certData);
    setShowCertificatePreview(true);
  };

  const handleDownloadCertificate = () => {
    if (!certificateData || !certificateData.id) return;

    const url = `/api/certificates/${certificateData.id}?showGrades=${showGrades ? 'true' : 'false'}`;
    window.open(url, '_blank');

    toast({
      title: "Success",
      description: "SKL sedang diproses dan akan terunduh otomatis",
    });
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      queryClient.setQueryData(['/api/user'], null);
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

  // Verify student mutation
  const verifyStudentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentId) return;
      await apiRequest('POST', `/api/students/verify`, {
        studentId: selectedStudentId,
        status: 'verified',
        verificationNotes: verificationNote,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student has been verified successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setShowVerificationModal(false);
      setVerificationNote('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject student mutation
  const rejectStudentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentId) return;
      await apiRequest('POST', `/api/students/verify`, {
        studentId: selectedStudentId,
        status: 'rejected',
        verificationNotes: rejectionReason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student has been rejected successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setShowRejectionModal(false);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {showWelcomeAnimation && user && (
        <WelcomeAnimation user={user} onClose={handleWelcomeClose} />
      )}
      <TeacherHeader user={user} onLogout={handleLogout} />

      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">Dashboard Guru</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center">
              <div className="p-3 rounded-full bg-yellow-500 bg-opacity-10 text-yellow-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Menunggu Verifikasi</p>
                {statsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <p className="text-2xl font-semibold">{stats?.pendingStudents || 0}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center">
              <div className="p-3 rounded-full bg-green-500 bg-opacity-10 text-green-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Sudah Diverifikasi</p>
                {statsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <p className="text-2xl font-semibold">{stats?.verifiedStudents || 0}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center">
              <div className="p-3 rounded-full bg-blue-500 bg-opacity-10 text-blue-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Total Siswa</p>
                {statsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <p className="text-2xl font-semibold">{stats?.totalStudents || 0}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Verification Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Verifikasi Data Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex mb-4">
              <div className="relative w-full">
                <Input
                  placeholder="Cari siswa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>

            {studentsLoading ? (
              <div className="flex justify-center p-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                {searchTerm 
                  ? "Tidak ada data siswa yang sesuai dengan pencarian" 
                  : "Tidak ada siswa yang menunggu verifikasi"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NISN</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.nisn}</TableCell>
                        <TableCell>{student.fullName}</TableCell>
                        <TableCell>{student.className}</TableCell>
                        <TableCell>
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Menunggu Verifikasi
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => viewStudentDetails(student.id)}
                              title="Lihat Detail"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => openVerificationModal(student.id)}
                            >
                              Verifikasi
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-red-500 hover:bg-red-600"
                              onClick={() => openRejectionModal(student.id)}
                            >
                              Tolak
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Detail Modal */}
      <Dialog open={showStudentDetailModal} onOpenChange={setShowStudentDetailModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Siswa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedStudentId && students ? (
              <div>
                {(() => {
                  const student = students.find(s => s.id === selectedStudentId);
                  if (!student) return <p>Siswa tidak ditemukan</p>;

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">NISN</p>
                          <p className="text-sm">{student.nisn}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">NIS</p>
                          <p className="text-sm">{student.nis}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Nama Lengkap</p>
                          <p className="text-sm">{student.fullName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Kelas</p>
                          <p className="text-sm">{student.className}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Tempat Lahir</p>
                          <p className="text-sm">{student.birthPlace}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Tanggal Lahir</p>
                          <p className="text-sm">{new Date(student.birthDate).toLocaleDateString('id-ID')}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Nama Orang Tua</p>
                          <p className="text-sm">{student.parentName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Status SKL</p>
                          <p className="text-sm capitalize">{student.status}</p>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-3 mt-4">
                        <Button 
                          variant="default"
                          onClick={() => {
                            setShowStudentDetailModal(false);
                            openCertificatePreview(student);
                          }}
                          className="w-full"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Lihat Pratinjau SKL
                        </Button>

                        <div className="flex justify-between">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setShowStudentDetailModal(false);
                              openVerificationModal(student.id);
                            }}
                            className="w-1/2 mr-2"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Verifikasi
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setShowStudentDetailModal(false);
                              openRejectionModal(student.id);
                            }}
                            className="w-1/2 ml-2"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Tolak
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex justify-center p-10">
                <Loader2 className="h-10 w-10 animate-spin text-border" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification Modal */}
      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verifikasi Data Siswa</DialogTitle>
            <DialogDescription>
              Verifikasi akan memungkinkan siswa untuk mengunduh SKL mereka.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedStudentId && students ? (
              <div>
                {(() => {
                  const student = students.find(s => s.id === selectedStudentId);
                  if (!student) return <p>Siswa tidak ditemukan</p>;

                  return (
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium">Nama: <span className="font-normal">{student.fullName}</span></p>
                        <p className="font-medium">NISN: <span className="font-normal">{student.nisn}</span></p>
                        <p className="font-medium">Kelas: <span className="font-normal">{student.className}</span></p>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="verificationNote" className="text-sm font-medium">
                          Catatan Verifikasi (Opsional)
                        </label>
                        <Input
                          id="verificationNote"
                          value={verificationNote}
                          onChange={(e) => setVerificationNote(e.target.value)}
                          placeholder="Catatan tambahan untuk verifikasi"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowVerificationModal(false)}
                        >
                          Batal
                        </Button>
                        <Button
                          onClick={() => verifyStudentMutation.mutate()}
                          disabled={verifyStudentMutation.isPending}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          {verifyStudentMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Memproses...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Verifikasi
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex justify-center p-10">
                <Loader2 className="h-10 w-10 animate-spin text-border" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Data Siswa</DialogTitle>
            <DialogDescription>
              Penolakan akan membutuhkan alasan yang jelas agar siswa dapat mengetahui masalahnya.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedStudentId && students ? (
              <div>
                {(() => {
                  const student = students.find(s => s.id === selectedStudentId);
                  if (!student) return <p>Siswa tidak ditemukan</p>;

                  return (
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium">Nama: <span className="font-normal">{student.fullName}</span></p>
                        <p className="font-medium">NISN: <span className="font-normal">{student.nisn}</span></p>
                        <p className="font-medium">Kelas: <span className="font-normal">{student.className}</span></p>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="rejectionReason" className="text-sm font-medium">
                          Alasan Penolakan <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="rejectionReason"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Alasan penolakan data siswa"
                          required
                        />
                        <p className="text-xs text-gray-500">
                          Alasan ini akan ditampilkan kepada siswa
                        </p>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowRejectionModal(false)}
                        >
                          Batal
                        </Button>
                        <Button
                          onClick={() => rejectStudentMutation.mutate()}
                          disabled={rejectStudentMutation.isPending || !rejectionReason}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          {rejectStudentMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Memproses...
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Tolak
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex justify-center p-10">
                <Loader2 className="h-10 w-10 animate-spin text-border" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificate Preview Modal */}
      <Dialog open={showCertificatePreview} onOpenChange={setShowCertificatePreview}>
        <DialogContent className="sm:max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pratinjau Surat Keterangan Lulus</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {certificateData ? (
              <>
                <div id="certificate-preview-container">
                  <Certificate data={certificateData} />
                </div>

                <div className="flex justify-center space-x-4 mt-6">
                  <Button 
                    onClick={() => {
                      const student = students?.find(s => s.id === certificateData.id);
                      if (student) {
                        const newCertData = prepareCertificateData(student, false, schoolSettings);
                        setCertificateData(newCertData);
                      }
                    }}
                    variant={!certificateData.showGrades ? "default" : "outline"}
                    className={!certificateData.showGrades ? "bg-primary hover:bg-primary/90" : ""}
                  >
                    SKL Tanpa Nilai
                  </Button>

                  <Button 
                    onClick={() => {
                      const student = students?.find(s => s.id === certificateData.id);
                      if (student) {
                        const newCertData = prepareCertificateData(student, true, schoolSettings);
                        setCertificateData(newCertData);
                      }
                    }}
                    variant={certificateData.showGrades ? "default" : "outline"}
                    className={certificateData.showGrades ? "bg-primary hover:bg-primary/90" : ""}
                  >
                    SKL Dengan Nilai
                  </Button>
                </div>

                <div className="flex justify-center mt-4">
                  <Button 
                    onClick={handleDownloadCertificate}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Unduh SKL
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex justify-center p-10">
                <Loader2 className="h-10 w-10 animate-spin text-border" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}