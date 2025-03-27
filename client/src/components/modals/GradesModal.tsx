import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Grade } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2 } from 'lucide-react';

interface GradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: number;
  studentName?: string;
}

const GradesModal: React.FC<GradesModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName = 'Siswa',
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newGrade, setNewGrade] = useState({ subjectName: '', value: '' });
  
  // Fetch existing grades
  const { 
    data: grades, 
    isLoading: isLoadingGrades,
    isError: isGradesError,
    error: gradesError
  } = useQuery<Grade[]>({
    queryKey: [`/api/students/${studentId}/grades`],
    enabled: isOpen && studentId !== undefined,
  });

  // Add grade mutation
  const addGradeMutation = useMutation({
    mutationFn: async (data: { studentId: number, subjectName: string, value: number }) => {
      const response = await apiRequest('POST', '/api/grades', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Nilai berhasil ditambahkan',
        description: `Nilai telah berhasil disimpan`,
      });
      setNewGrade({ subjectName: '', value: '' });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/grades`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal menambahkan nilai',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Delete grade mutation
  const deleteGradeMutation = useMutation({
    mutationFn: async (gradeId: number) => {
      await apiRequest('DELETE', `/api/grades/${gradeId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Nilai berhasil dihapus',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}/grades`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal menghapus nilai',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const handleAddGrade = () => {
    const value = parseFloat(newGrade.value);
    
    if (!newGrade.subjectName.trim()) {
      toast({
        title: 'Nama mata pelajaran kosong',
        description: 'Harap masukkan nama mata pelajaran',
        variant: 'destructive',
      });
      return;
    }
    
    if (isNaN(value) || value < 0 || value > 100) {
      toast({
        title: 'Nilai tidak valid',
        description: 'Nilai harus berupa angka 0-100',
        variant: 'destructive',
      });
      return;
    }
    
    if (studentId) {
      addGradeMutation.mutate({
        studentId,
        subjectName: newGrade.subjectName,
        value
      });
    }
  };
  
  const handleDeleteGrade = (gradeId: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus nilai ini?')) {
      deleteGradeMutation.mutate(gradeId);
    }
  };
  
  const getAverageGrade = () => {
    if (!grades || grades.length === 0) return 0;
    
    const sum = grades.reduce((acc, grade) => acc + grade.value, 0);
    return sum / grades.length;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kelola Nilai {studentName}</DialogTitle>
          <DialogDescription>
            Tambah dan kelola nilai untuk siswa ini
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Label htmlFor="subjectName">Mata Pelajaran</Label>
              <Input
                id="subjectName"
                value={newGrade.subjectName}
                onChange={(e) => setNewGrade({ ...newGrade, subjectName: e.target.value })}
                placeholder="Nama mata pelajaran"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="value">Nilai</Label>
              <Input
                id="value"
                value={newGrade.value}
                onChange={(e) => setNewGrade({ ...newGrade, value: e.target.value })}
                placeholder="0-100"
                className="mt-1"
                type="number"
                min="0"
                max="100"
              />
            </div>
          </div>
          
          <Button 
            onClick={handleAddGrade} 
            className="w-full"
            disabled={addGradeMutation.isPending}
          >
            {addGradeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Tambah Nilai'
            )}
          </Button>
          
          <div className="border rounded-lg">
            <div className="p-2 bg-gray-50 dark:bg-gray-800 border-b">
              <h3 className="text-sm font-medium">Daftar Nilai</h3>
            </div>
            
            {isLoadingGrades ? (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : isGradesError ? (
              <div className="text-center text-sm text-destructive p-4">
                Gagal memuat data nilai: {gradesError?.message}
              </div>
            ) : (!grades || grades.length === 0) ? (
              <div className="text-center text-sm text-muted-foreground p-4">
                Belum ada data nilai
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead className="text-right">Nilai</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell>{grade.subjectName}</TableCell>
                      <TableCell className="text-right">{grade.value}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteGrade(grade.id)}
                          disabled={deleteGradeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          
          {grades && grades.length > 0 && (
            <div className="flex justify-between text-sm">
              <span>Rata-rata Nilai:</span>
              <span className="font-medium">{getAverageGrade().toFixed(2)}</span>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GradesModal;