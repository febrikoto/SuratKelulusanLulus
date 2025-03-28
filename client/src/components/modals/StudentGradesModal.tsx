import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Student } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Book,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  SortAsc,
  SortDesc,
} from 'lucide-react';

interface StudentGradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

interface GradeData {
  id: number;
  subjectName: string;
  value: number;
  group?: string;
  category?: string;
}

// Dummy data untuk contoh tampilan
const dummyGrades: GradeData[] = [
  { id: 1, subjectName: 'Matematika', value: 85, group: 'Wajib', category: 'Umum' },
  { id: 2, subjectName: 'Bahasa Indonesia', value: 90, group: 'Wajib', category: 'Umum' },
  { id: 3, subjectName: 'Bahasa Inggris', value: 78, group: 'Wajib', category: 'Umum' },
  { id: 4, subjectName: 'Fisika', value: 82, group: 'Wajib', category: 'MIPA' },
  { id: 5, subjectName: 'Kimia', value: 75, group: 'Wajib', category: 'MIPA' },
  { id: 6, subjectName: 'Biologi', value: 88, group: 'Wajib', category: 'MIPA' },
  { id: 7, subjectName: 'Ekonomi', value: 80, group: 'Peminatan', category: 'IPS' },
  { id: 8, subjectName: 'Sejarah', value: 85, group: 'Peminatan', category: 'IPS' },
  { id: 9, subjectName: 'Pemrograman Web', value: 92, group: 'Kejuruan', category: 'RPL' },
  { id: 10, subjectName: 'Basis Data', value: 88, group: 'Kejuruan', category: 'RPL' },
  { id: 11, subjectName: 'Desain Grafis', value: 90, group: 'Kejuruan', category: 'Multimedia' },
  { id: 12, subjectName: 'Animasi', value: 85, group: 'Kejuruan', category: 'Multimedia' },
];

const calculateAverageGrade = (grades: GradeData[]): number => {
  if (grades.length === 0) return 0;
  const sum = grades.reduce((acc, grade) => acc + grade.value, 0);
  return Math.round((sum / grades.length) * 100) / 100;
};

const getGradeColor = (value: number): string => {
  if (value >= 90) return 'text-green-600 font-semibold';
  if (value >= 80) return 'text-green-500';
  if (value >= 70) return 'text-yellow-600';
  return 'text-red-500';
};

const StudentGradesModal: React.FC<StudentGradesModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);

  // Gunakan data dummy untuk demo
  const grades = dummyGrades;
  
  // Untuk implementasi nyata, gunakan ini:
  // const { data: grades = [], isLoading } = useQuery<GradeData[]>({
  //   queryKey: [`/api/students/${student.id}/grades`],
  //   enabled: isOpen && student?.id !== undefined,
  // });

  // Fungsi untuk sorting
  const sortedGrades = React.useMemo(() => {
    let sortableGrades = [...grades];
    if (sortConfig !== null) {
      sortableGrades.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableGrades;
  }, [grades, sortConfig]);

  // Fungsi untuk request sorting
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Fungsi untuk mendapatkan icon sorting
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <SortAsc className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'ascending' ? (
      <SortAsc className="h-4 w-4 text-primary" />
    ) : (
      <SortDesc className="h-4 w-4 text-primary" />
    );
  };

  // Filter grades berdasarkan pencarian
  const filteredGrades = sortedGrades.filter(
    (grade) =>
      grade.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (grade.group && grade.group.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (grade.category && grade.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group grades berdasarkan kategori
  const groupedGrades = filteredGrades.reduce((acc, grade) => {
    const category = grade.category || 'Lainnya';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(grade);
    return acc;
  }, {} as Record<string, GradeData[]>);

  // Hitung nilai rata-rata
  const averageGrade = calculateAverageGrade(grades);
  
  // Statistik grup/kelompok mata pelajaran
  const groupStats = grades.reduce((acc, grade) => {
    const group = grade.group || 'Lainnya';
    if (!acc[group]) {
      acc[group] = { count: 0, sum: 0 };
    }
    acc[group].count += 1;
    acc[group].sum += grade.value;
    return acc;
  }, {} as Record<string, { count: number; sum: number }>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Data Nilai Siswa</DialogTitle>
          <DialogDescription>
            {student.fullName} - {student.nisn}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Mata Pelajaran</div>
              <div className="text-2xl font-bold">{grades.length}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Rata-rata Nilai</div>
              <div className={`text-2xl font-bold ${getGradeColor(averageGrade)}`}>
                {averageGrade}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">Status Kelulusan</div>
              <div className="flex items-center mt-1">
                <Badge variant={averageGrade >= 75 ? "success" : "destructive"} className="text-xs py-1">
                  {averageGrade >= 75 ? "LULUS" : "BELUM LULUS"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Search and filter */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                placeholder="Cari mata pelajaran..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-1">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>

          {/* Grades table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="w-[50px] text-center"
                    onClick={() => requestSort('id')}
                  >
                    <div className="flex items-center justify-center cursor-pointer">
                      <span>No</span>
                      {getSortIcon('id')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => requestSort('subjectName')}
                  >
                    <div className="flex items-center">
                      <span>Mata Pelajaran</span>
                      {getSortIcon('subjectName')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[150px]">
                    <div className="flex items-center">
                      <span>Kelompok</span>
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-[120px] text-right cursor-pointer"
                    onClick={() => requestSort('value')}
                  >
                    <div className="flex items-center justify-end">
                      <span>Nilai</span>
                      {getSortIcon('value')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedGrades).map(([category, categoryGrades]) => (
                  <React.Fragment key={category}>
                    <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                      <TableCell colSpan={4} className="font-medium py-2">
                        {category}
                      </TableCell>
                    </TableRow>
                    {categoryGrades.map((grade, index) => (
                      <TableRow key={grade.id}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Book className="h-4 w-4 mr-2 text-gray-400" />
                            {grade.subjectName}
                          </div>
                        </TableCell>
                        <TableCell>
                          {grade.group && (
                            <Badge variant="outline" className="font-normal">
                              {grade.group}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right ${getGradeColor(grade.value)}`}>
                          {grade.value}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-b-2">
                      <TableCell colSpan={3} className="text-right font-medium">
                        Rata-rata {category}:
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        getGradeColor(
                          categoryGrades.reduce((sum, g) => sum + g.value, 0) / categoryGrades.length
                        )
                      }`}>
                        {Math.round((categoryGrades.reduce((sum, g) => sum + g.value, 0) / categoryGrades.length) * 100) / 100}
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
                {filteredGrades.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                      Tidak ada data nilai yang ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Group statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(groupStats).map(([group, stats]) => (
              <div key={group} className="border rounded-md p-3">
                <div className="text-sm font-medium mb-1">{group}</div>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {stats.count} mata pelajaran
                  </div>
                  <div className={`text-sm font-medium ${getGradeColor(stats.sum / stats.count)}`}>
                    Rata-rata: {Math.round((stats.sum / stats.count) * 100) / 100}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={() => window.print()} className="gap-1">
            <Download className="h-4 w-4" />
            Cetak Laporan Nilai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentGradesModal;