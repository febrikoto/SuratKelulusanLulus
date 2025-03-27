import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Student } from '@shared/schema';
import { DashboardStats } from '@shared/types';
import { Loader2, Search, Eye } from 'lucide-react';
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
import Header from '@/components/Header';
import StudentDetailModal from '@/components/modals/StudentDetailModal';
import VerificationModal from '@/components/modals/VerificationModal';
import RejectionModal from '@/components/modals/RejectionModal';

export default function TeacherDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | undefined>(undefined);
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });
  
  // Fetch students
  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['/api/students'],
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <Header />
      
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
      
      {/* Modals */}
      <StudentDetailModal
        isOpen={showStudentDetailModal}
        onClose={() => setShowStudentDetailModal(false)}
        studentId={selectedStudentId}
      />
      
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        studentId={selectedStudentId}
        mode="verify"
      />
      
      <RejectionModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        studentId={selectedStudentId}
      />
    </div>
  );
}
