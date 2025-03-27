import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { DashboardStats } from '@shared/types';
import { Student } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { prepareCertificateData, generatePdf } from '@/lib/utils.tsx';
import { 
  PlusCircle, 
  Upload, 
  FileText, 
  Search, 
  Trash2, 
  PencilLine, 
  Eye, 
  Download, 
  Loader2 
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
import Header from '@/components/Header';
import AddStudentModal from '@/components/modals/AddStudentModal';
import ImportCsvModal from '@/components/modals/ImportCsvModal';
import StudentDetailModal from '@/components/modals/StudentDetailModal';
import Certificate from '@/components/Certificate';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showImportCsvModal, setShowImportCsvModal] = useState(false);
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(undefined);
  const [previewCertificateData, setPreviewCertificateData] = useState<any | null>(null);
  
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });
  
  // Fetch students
  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['/api/students'],
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
  
  const generateCertificate = (student: Student) => {
    const certificateData = prepareCertificateData(student);
    setPreviewCertificateData(certificateData);
    
    // Use setTimeout to ensure the certificate is rendered before generating PDF
    setTimeout(() => {
      generatePdf('certificate-container', `SKL_${student.nisn}.pdf`)
        .then(() => {
          toast({
            title: "Success",
            description: "Certificate downloaded successfully",
          });
          setPreviewCertificateData(null);
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to generate certificate",
            variant: "destructive",
          });
          console.error(error);
          setPreviewCertificateData(null);
        });
    }, 500);
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
        
        const matchesStatus = statusFilter === '' || student.status === statusFilter;
        const matchesClass = classFilter === '' || student.className === classFilter;
        
        return matchesSearch && matchesStatus && matchesClass;
      })
    : [];
  
  // Get unique class names for filter dropdown
  const uniqueClasses = students
    ? Array.from(new Set(students.map(student => student.className)))
    : [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <Header />
      
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
              Import CSV
            </Button>
            <Button 
              onClick={handleGenerateAllCertificates}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Semua SKL
            </Button>
          </div>
        </div>
        
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                    <SelectItem value="">Semua Kelas</SelectItem>
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
                    <SelectItem value="">Semua Status</SelectItem>
                    <SelectItem value="verified">Terverifikasi</SelectItem>
                    <SelectItem value="pending">Menunggu Verifikasi</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                {searchTerm || statusFilter || classFilter 
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
                              onClick={() => toast({
                                description: "Edit feature would be implemented in a real app"
                              })}
                              title="Edit"
                            >
                              <PencilLine className="h-4 w-4 text-indigo-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteStudent(student.id)}
                              title="Delete"
                              disabled={deleteStudentMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Pagination - would be implemented in a real application */}
            {filteredStudents.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Menampilkan {filteredStudents.length} siswa
                </div>
                {/* Pagination UI would go here */}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Modals */}
      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
      />
      
      <ImportCsvModal
        isOpen={showImportCsvModal}
        onClose={() => setShowImportCsvModal(false)}
      />
      
      <StudentDetailModal
        isOpen={showStudentDetailModal}
        onClose={() => setShowStudentDetailModal(false)}
        studentId={selectedStudentId}
      />
      
      {/* Hidden certificate for PDF generation */}
      <div className="hidden">
        {previewCertificateData && (
          <Certificate data={previewCertificateData} />
        )}
      </div>
    </div>
  );
}
