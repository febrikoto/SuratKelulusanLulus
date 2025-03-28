import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Student } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { AdminHeader } from '@/components/AdminHeader';
import { TeacherHeader } from '@/components/TeacherHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GraduationCap, FileSpreadsheet, Search, Filter, Download, Book, Eye } from 'lucide-react';
import StudentGradesModal from '@/components/modals/StudentGradesModal';
import GradeImportModal from '@/components/modals/GradeImportModal';

// Dummy data untuk contoh tampilan
// Memperluas tipe Student untuk data dummy
interface ExtendedStudent extends Student {
  major?: string;
}

const dummyStudents: ExtendedStudent[] = [
  {
    id: 1,
    nisn: '1234567890',
    nis: '123456',
    fullName: 'Budi Santoso',
    birthPlace: 'Jakarta',
    birthDate: '2005-05-15',
    parentName: 'Joko Santoso',
    className: 'XII RPL 1',
    status: 'verified',
    createdAt: new Date('2023-10-10'),
    verifiedBy: 1,
    verificationDate: new Date('2023-10-10'),
    verificationNotes: null,
    major: 'RPL'
  },
  {
    id: 2,
    nisn: '0987654321',
    nis: '098765',
    fullName: 'Dewi Anggraini',
    birthPlace: 'Bandung',
    birthDate: '2005-03-20',
    parentName: 'Agus Anggraini',
    className: 'XII RPL 1',
    status: 'verified',
    createdAt: new Date('2023-10-11'),
    verifiedBy: 1,
    verificationDate: new Date('2023-10-11'),
    verificationNotes: null,
    major: 'RPL'
  },
  {
    id: 3,
    nisn: '1122334455',
    nis: '112233',
    fullName: 'Ahmad Rizki',
    birthPlace: 'Surabaya',
    birthDate: '2005-07-10',
    parentName: 'Budi Rizki',
    className: 'XII TKJ 1',
    status: 'verified',
    createdAt: new Date('2023-10-12'),
    verifiedBy: 1,
    verificationDate: new Date('2023-10-12'),
    verificationNotes: null,
    major: 'TKJ'
  },
  {
    id: 4,
    nisn: '6677889900',
    nis: '667788',
    fullName: 'Siti Nurhaliza',
    birthPlace: 'Medan',
    birthDate: '2005-11-25',
    parentName: 'Hasan Nurhaliza',
    className: 'XII MM 1',
    status: 'verified',
    createdAt: new Date('2023-10-13'),
    verifiedBy: 1,
    verificationDate: new Date('2023-10-13'),
    verificationNotes: null,
    major: 'MM'
  },
  {
    id: 5,
    nisn: '5566778899',
    nis: '556677',
    fullName: 'Rudi Hartono',
    birthPlace: 'Semarang',
    birthDate: '2005-09-05',
    parentName: 'Bambang Hartono',
    className: 'XII RPL 2',
    status: 'verified',
    createdAt: new Date('2023-10-14'),
    verifiedBy: 1,
    verificationDate: new Date('2023-10-14'),
    verificationNotes: null,
    major: 'RPL'
  },
];

interface ClassCount {
  className: string;
  count: number;
  withGrades: number;
}

// Function to generate dummy class statistics
const generateClassStats = (students: Student[]): ClassCount[] => {
  const classes: { [key: string]: { count: number; withGrades: number } } = {};
  
  students.forEach(student => {
    if (!classes[student.className]) {
      classes[student.className] = { count: 0, withGrades: 0 };
    }
    classes[student.className].count += 1;
    // Randomly determine if a student has grades
    if (Math.random() > 0.3) {
      classes[student.className].withGrades += 1;
    }
  });
  
  return Object.entries(classes).map(([className, stats]) => ({
    className,
    count: stats.count,
    withGrades: stats.withGrades
  }));
};

const GradesPage: React.FC = () => {
  const { user, logoutMutation } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isGradesModalOpen, setIsGradesModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Use dummy data for demo
  const students = dummyStudents;
  const classStats = generateClassStats(students);
  
  // For real implementation, use this:
  // const { data: students = [], isLoading } = useQuery<Student[]>({
  //   queryKey: ['/api/students'],
  // });
  
  // Filter students based on search and class filter
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nisn.includes(searchTerm) ||
      student.nis.includes(searchTerm);
    
    const matchesClass = !selectedClass || student.className === selectedClass;
    
    return matchesSearch && matchesClass;
  });
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const openGradesModal = (student: Student) => {
    setSelectedStudent(student);
    setIsGradesModalOpen(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {user?.role === 'admin' ? (
        <AdminHeader user={user} onLogout={handleLogout} />
      ) : (
        <TeacherHeader user={user!} onLogout={handleLogout} />
      )}
      
      <main className="container mx-auto py-6 px-4 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Book className="h-6 w-6" />
          Manajemen Nilai Siswa
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Siswa</CardTitle>
              <CardDescription>Jumlah total siswa yang terdaftar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{students.length}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Dari {classStats.length} kelas
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Siswa dengan Nilai</CardTitle>
              <CardDescription>Jumlah siswa yang sudah memiliki nilai</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{
                classStats.reduce((sum, cls) => sum + cls.withGrades, 0)
              }</div>
              <div className="text-sm text-muted-foreground mt-1">
                {Math.round((classStats.reduce((sum, cls) => sum + cls.withGrades, 0) / students.length) * 100)}% dari total siswa
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Siswa Tanpa Nilai</CardTitle>
              <CardDescription>Jumlah siswa yang belum memiliki nilai</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{
                students.length - classStats.reduce((sum, cls) => sum + cls.withGrades, 0)
              }</div>
              <div className="text-sm text-muted-foreground mt-1 flex gap-2">
                <Button size="sm" variant="outline" className="h-7" onClick={() => setIsImportModalOpen(true)}>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                  <span>Import Nilai</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  type="search"
                  placeholder="Cari siswa berdasarkan nama atau NISN..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Button variant="outline" className="gap-1">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="gap-1">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export Nilai</span>
              </Button>
              
              <Button onClick={() => setIsImportModalOpen(true)} className="gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Import Nilai</span>
              </Button>
            </div>
          </div>
          
          <div className="mb-4 flex gap-2 flex-wrap">
            <Badge 
              variant={selectedClass === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedClass(null)}
            >
              Semua Kelas
            </Badge>
            {classStats.map(cls => (
              <Badge 
                key={cls.className}
                variant={selectedClass === cls.className ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedClass(cls.className)}
              >
                {cls.className} ({cls.count})
              </Badge>
            ))}
          </div>
          
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">No</TableHead>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead className="w-[100px]">NISN</TableHead>
                  <TableHead className="w-[100px]">NIS</TableHead>
                  <TableHead className="w-[120px]">Kelas</TableHead>
                  <TableHead className="w-[120px]">Status Nilai</TableHead>
                  <TableHead className="w-[100px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{student.fullName}</TableCell>
                      <TableCell className="font-mono text-xs">{student.nisn}</TableCell>
                      <TableCell className="font-mono text-xs">{student.nis}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {student.className}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {index % 3 === 0 ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Belum Ada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Lengkap
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openGradesModal(student)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          <span className="sr-only">Lihat Nilai</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Tidak ada siswa yang ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Menampilkan {filteredStudents.length} dari {students.length} siswa
          </div>
        </div>
      </main>
      
      {/* Modals */}
      {selectedStudent && (
        <StudentGradesModal
          isOpen={isGradesModalOpen}
          onClose={() => setIsGradesModalOpen(false)}
          student={selectedStudent}
        />
      )}
      
      <GradeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};

export default GradesPage;