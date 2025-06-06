import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { DashboardStats } from '@shared/types';
import { Student } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

import WelcomeAnimation from '@/components/WelcomeAnimation';
import { 
  PlusCircle, 
  Upload, 
  FileText, 
  Search, 
  Trash2, 
  PencilLine, 
  Eye, 
  Download, 
  Loader2,
  FileSpreadsheet,
  School,
  Settings,
  FileBadge,
  BookOpen,
  DatabaseIcon,
  FileDown,
  X,
  Users
} from 'lucide-react';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import AdminHeader from '@/components/AdminHeader';
import { Certificate } from '@/components/Certificate';
import AddStudentModal from '@/components/modals/AddStudentModal';
import EditStudentModal from '@/components/modals/EditStudentModal';
import GradesModal from '@/components/modals/GradesModal';
import GradeImportModal from '@/components/modals/GradeImportModal';
import SchoolSettingsModal from '@/components/modals/SchoolSettingsModal';
import CertificateSettingsModal from '@/components/modals/CertificateSettingsModal';
import BulkDeleteModal from '@/components/modals/BulkDeleteModal';
import { TeacherManagementTable } from '@/components/TeacherManagementTable';
import { EditTeacherModal } from '@/components/modals/EditTeacherModal';

export default function AdminDashboard() {
  const { user: authUser, updateWelcomeStatus } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [, setLocation] = useLocation();
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(false);
  
  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await apiRequest('GET', '/api/user');
        const userData = await response.json();
        if (userData && userData.role === 'admin') {
          setUser(userData);
          // Check if user should see welcome animation
          if (userData && !userData.hasSeenWelcome) {
            setShowWelcomeAnimation(true);
          }
        } else {
          // Redirect if not admin
          setLocation('/');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setLocation('/');
      }
    };
    
    fetchUser();
  }, [setLocation]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      setLocation('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showImportCsvModal, setShowImportCsvModal] = useState(false);
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  const [showGradeImportModal, setShowGradeImportModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showSchoolSettingsModal, setShowSchoolSettingsModal] = useState(false);
  const [showCertificateSettingsModal, setShowCertificateSettingsModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(undefined);
  const [selectedStudentName, setSelectedStudentName] = useState<string | undefined>(undefined);
  const [previewCertificateData, setPreviewCertificateData] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });
  
  // Fetch students
  const { data: students, isLoading: studentsLoading, refetch: fetchStudents } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });
  
  // Fetch school settings
  const { data: schoolSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/settings'],
  });
  
  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/students/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteStudent = (id: number) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      deleteStudentMutation.mutate(id);
    }
  };
  
  const viewStudentDetails = (id: number) => {
    setSelectedStudentId(id);
    setShowStudentDetailModal(true);
  };
  
  // Untuk modal edit siswa
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  
  const editStudent = (id: number) => {
    setSelectedStudentId(id);
    setShowEditStudentModal(true);
  };
  
  const generateCertificate = (student: Student) => {
    const url = `/api/certificates/${student.id}?showGrades=false`;
    window.open(url, '_blank');
    
    toast({
      title: "Certificate Requested",
      description: "Certificate is being generated and will download automatically",
    });
  };
  
  const handleGenerateAllCertificates = () => {
    toast({
      title: "Info",
      description: "This feature would generate all certificates in a real application",
    });
  };
  
  // Filter students based on search term and filters
  const filteredStudents = students
    ? students.filter(student => {
        const matchesSearch = searchTerm === '' ||
          student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.nisn.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
        const matchesClass = classFilter === 'all' || student.className === classFilter;
        
        return matchesSearch && matchesStatus && matchesClass;
      })
    : [];
  
  // Get unique class names for filter dropdown
  const uniqueClasses = students
    ? Array.from(new Set(students.map(student => student.className)))
    : [];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {showWelcomeAnimation && user && (
        <WelcomeAnimation user={user} onClose={handleWelcomeClose} />
      )}
      <AdminHeader user={user} onLogout={handleLogout} />
      
      <div>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <h2 className="text-xl md:text-2xl font-semibold">Dashboard Admin</h2>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => setShowAddStudentModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Siswa
            </Button>
            <Button 
              onClick={() => setShowImportCsvModal(true)}
              variant="secondary"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Siswa Excel
            </Button>
            <Button 
              onClick={() => setShowGradeImportModal(true)}
              variant="secondary"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import Nilai Excel
            </Button>
            <Button 
              onClick={handleGenerateAllCertificates}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Semua SKL
            </Button>
            <Button 
              onClick={() => setShowSchoolSettingsModal(true)}
              variant="outline"
              className="border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
            >
              <School className="mr-2 h-4 w-4" />
              Pengaturan Sekolah
            </Button>
            <Button 
              onClick={() => setShowCertificateSettingsModal(true)}
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
            >
              <FileBadge className="mr-2 h-4 w-4" />
              Pengaturan SKL
            </Button>
            <Button 
              onClick={() => setLocation('/subjects')}
              variant="outline"
              className="border-teal-500 text-teal-600 hover:bg-teal-50 hover:text-teal-700"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Mata Pelajaran
            </Button>
            
            <Button 
              onClick={() => {
                const section = document.getElementById('teacher-management-section');
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth' });
                } else {
                  toast({
                    title: "Info",
                    description: "Sedang memuat pengelolaan guru..."
                  });
                }
              }}
              variant="outline"
              className="border-indigo-500 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Users className="mr-2 h-4 w-4" />
              Kelola Guru
            </Button>
            
            <Button 
              onClick={() => setShowBulkDeleteModal(true)}
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <DatabaseIcon className="mr-2 h-4 w-4" />
              Hapus Data Massal
            </Button>
          </div>
        </div>
        
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center">
              <div className="p-3 rounded-full bg-primary bg-opacity-10 text-primary mr-4">
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
          
          <Card>
            <CardContent className="p-4 flex items-center">
              <div className="p-3 rounded-full bg-blue-500 bg-opacity-10 text-blue-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Total Kelas</p>
                {statsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <p className="text-2xl font-semibold">{stats?.totalClasses || 0}</p>
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
                <p className="text-gray-500 dark:text-gray-400 text-sm">SKL Disetujui</p>
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
              <div className="p-3 rounded-full bg-red-500 bg-opacity-10 text-red-500 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Data Ditolak</p>
                {statsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <p className="text-2xl font-semibold">{stats?.rejectedStudents || 0}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Search and filter tools */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-grow">
                <label htmlFor="searchStudent" className="block text-sm font-medium mb-1">Cari Siswa</label>
                <div className="relative">
                  <Input
                    id="searchStudent"
                    placeholder="Cari berdasarkan nama atau NISN"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="md:w-48">
                <label htmlFor="filterClass" className="block text-sm font-medium mb-1">Filter Kelas</label>
                <Select 
                  value={classFilter} 
                  onValueChange={setClassFilter}
                >
                  <SelectTrigger id="filterClass">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {uniqueClasses.map(className => (
                      <SelectItem key={className} value={className}>{className}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:w-48">
                <label htmlFor="filterStatus" className="block text-sm font-medium mb-1">Status SKL</label>
                <Select 
                  value={statusFilter} 
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger id="filterStatus">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="verified">Terverifikasi</SelectItem>
                    <SelectItem value="pending">Menunggu Verifikasi</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Teacher Management Section */}
        <Card className="mb-6" id="teacher-management-section">
          <CardHeader>
            <CardTitle>Pengelolaan Guru</CardTitle>
            <CardDescription>
              Kelola data guru dan pembagian jurusan yang diampu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeacherManagementTable settings={schoolSettings} />
          </CardContent>
        </Card>
        
        {/* Student Data Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Data Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="flex justify-center p-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                {searchTerm || statusFilter !== 'all' || classFilter !== 'all' 
                  ? "Tidak ada data siswa yang sesuai dengan filter" 
                  : "Belum ada data siswa"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NISN</TableHead>
                      <TableHead>Nama Siswa</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Status SKL</TableHead>
                      <TableHead>Nilai</TableHead>
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
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${student.status === 'verified' ? 'bg-green-100 text-green-800' : 
                              student.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {student.status === 'verified' ? 'Terverifikasi' : 
                             student.status === 'pending' ? 'Menunggu Verifikasi' : 
                             'Ditolak'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setSelectedStudentName(student.fullName);
                              setShowGradeModal(true);
                            }}
                          >
                            Kelola Nilai
                          </Button>
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
                              variant="ghost"
                              size="icon"
                              onClick={() => editStudent(student.id)}
                              title="Edit Data"
                            >
                              <PencilLine className="h-4 w-4 text-orange-600" />
                            </Button>
                            {student.status === 'verified' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => generateCertificate(student)}
                                title="Download SKL"
                              >
                                <Download className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteStudent(student.id)}
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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
      
      {/* Add Student Modal */}
      <AddStudentModal 
        isOpen={showAddStudentModal} 
        onClose={() => setShowAddStudentModal(false)} 
      />
      
      {/* Import Excel Modal */}
      <Dialog open={showImportCsvModal} onOpenChange={setShowImportCsvModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Data Siswa dari Excel</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex-1 overflow-y-auto pr-1">
            <p className="text-sm text-gray-500 mb-4">
              Silahkan unduh template Excel untuk kelas yang diperlukan, isi data siswa dan upload kembali.
            </p>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Unduh Template</h3>
              
              <div className="grid grid-cols-1 gap-2">
                {[...(uniqueClasses.length > 0 ? uniqueClasses : ['XII MIPA', 'XII IPS', 'XII BAHASA'])].map((className) => (
                  <div key={className} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="text-sm">{className}</div>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-1 text-xs h-8" 
                      onClick={() => {
                        // Mengunduh template Excel untuk kelas tertentu
                        const url = `/api/export/student-template?class=${encodeURIComponent(className)}`;
                        window.open(url, '_blank');
                        
                        toast({
                          title: "Template Excel",
                          description: `Template Excel untuk kelas ${className} sedang diunduh`,
                        });
                      }}
                    >
                      <FileDown className="h-3.5 w-3.5 mr-1" />
                      Unduh
                    </Button>
                  </div>
                ))}
                
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="text-sm">Template Kelas Baru</div>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-1 text-xs h-8" 
                    onClick={() => {
                      // Mengunduh template kosong untuk kelas baru
                      const url = `/api/export/student-template`;
                      window.open(url, '_blank');
                      
                      toast({
                        title: "Template Excel",
                        description: "Template Excel untuk kelas baru sedang diunduh",
                      });
                    }}
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1" />
                    Unduh
                  </Button>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-2">Upload File Excel</h3>
                <div 
                  className="border-dashed border-2 border-gray-300 rounded-md p-6 text-center cursor-pointer hover:bg-gray-50"
                  onClick={() => document.getElementById('excel-file-upload')?.click()}
                >
                  <input
                    type="file"
                    id="excel-file-upload"
                    className="hidden" 
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Simpan file yang dipilih dalam state
                        setSelectedFile(file);
                        
                        toast({
                          title: "File dipilih",
                          description: `File "${file.name}" siap untuk diimport`,
                        });
                      }
                    }}
                  />
                  <Upload className="h-8 w-8 mx-auto text-primary mb-3" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Klik untuk upload file Excel</p>
                  <p className="text-xs text-gray-500 mt-1">Format: .xlsx, .xls</p>
                </div>
                {selectedFile && (
                  <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md flex items-center justify-between">
                    <div className="flex items-center">
                      <FileSpreadsheet className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
                    </div>
                    <button
                      className="text-gray-500 hover:text-red-500"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportCsvModal(false);
                setSelectedFile(null);
              }}
            >
              Batal
            </Button>
            <Button
              disabled={!selectedFile}
              onClick={async () => {
                if (!selectedFile) return;
                
                try {
                  // Buat FormData untuk mengirim file
                  const formData = new FormData();
                  formData.append('file', selectedFile);
                  
                  // Kirim file ke endpoint import
                  const response = await fetch('/api/students/import', {
                    method: 'POST',
                    body: formData,
                  });
                  
                  if (!response.ok) {
                    const error = await response.text();
                    throw new Error(error || 'Gagal mengimpor data siswa');
                  }
                  
                  const result = await response.json();
                  
                  // Update daftar siswa setelah import berhasil
                  fetchStudents();
                  
                  // Tampilkan pesan sukses
                  toast({
                    title: "Import berhasil",
                    description: `${result.imported} data siswa berhasil diimpor${result.errors ? `, ${result.errors.length} data gagal` : ''}`,
                    variant: result.errors ? "default" : undefined,
                  });
                  
                  // Tutup modal
                  setShowImportCsvModal(false);
                  setSelectedFile(null);
                } catch (error) {
                  console.error('Error importing students:', error);
                  toast({
                    title: "Gagal import data",
                    description: error instanceof Error ? error.message : 'Terjadi kesalahan saat mengimpor data',
                    variant: "destructive",
                  });
                }
              }}
            >
              Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
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
                      
                      {student.status === 'verified' && (
                        <div className="mt-4">
                          <Button 
                            onClick={() => {
                              setShowStudentDetailModal(false);
                              generateCertificate(student);
                            }}
                            className="w-full"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download SKL
                          </Button>
                        </div>
                      )}
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
      
      {/* Grade Management Modal */}
      <GradesModal
        isOpen={showGradeModal}
        onClose={() => setShowGradeModal(false)}
        studentId={selectedStudentId}
        studentName={selectedStudentName}
      />
      
      {/* Grade Import Modal */}
      <GradeImportModal
        isOpen={showGradeImportModal}
        onClose={() => setShowGradeImportModal(false)}
      />
      
      {/* School Settings Modal */}
      <SchoolSettingsModal
        isOpen={showSchoolSettingsModal}
        onClose={() => setShowSchoolSettingsModal(false)}
      />
      
      {/* Certificate Settings Modal */}
      <CertificateSettingsModal
        isOpen={showCertificateSettingsModal}
        onClose={() => setShowCertificateSettingsModal(false)}
      />
      
      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
      />
      
      {/* Teacher Management Section */}
      {/* Teacher Management Section sudah dipindahkan ke atas */}
      
      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={showEditStudentModal}
        onClose={() => setShowEditStudentModal(false)}
        studentId={selectedStudentId}
      />
      
      {/* Hidden certificate for PDF generation */}
      <div className="hidden" id="certificate-container">
        {previewCertificateData && (
          <Certificate data={previewCertificateData} />
        )}
      </div>
    </div>
  );
}