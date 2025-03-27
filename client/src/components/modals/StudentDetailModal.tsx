import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from '@tanstack/react-query';
import { Student } from '@shared/schema';
import { User } from '@shared/schema';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: number;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ isOpen, onClose, studentId }) => {
  const { data: student, isLoading } = useQuery<Student>({
    queryKey: studentId ? [`/api/students/${studentId}`] : ['no-student'],
    enabled: !!studentId && isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Detail Siswa</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !student ? (
          <div className="text-center p-4 text-gray-500">
            Data siswa tidak ditemukan
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Data Diri</h4>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">NISN:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">{student.nisn}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">NIS:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">{student.nis}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Nama Lengkap:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">{student.fullName}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Tempat, Tanggal Lahir:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">
                    {student.birthPlace}, {student.birthDate}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Nama Orang Tua:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">{student.parentName}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Kelas:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">{student.className}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Status SKL:</span>
                  <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${student.status === 'verified' ? 'bg-green-100 text-green-800' : 
                      student.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}`}>
                    {student.status === 'verified' ? 'Terverifikasi' : 
                     student.status === 'pending' ? 'Menunggu Verifikasi' : 
                     'Ditolak'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Riwayat Verifikasi</h4>
              
              {student.verificationDate ? (
                <div className="space-y-3">
                  <div className={`border-l-2 ${student.status === 'verified' ? 'border-green-500' : 'border-red-500'} pl-3`}>
                    <div className="text-sm text-gray-800 dark:text-gray-200">
                      Data {student.status === 'verified' ? 'diverifikasi' : 'ditolak'} 
                      {student.verifiedBy ? ` oleh ID: ${student.verifiedBy}` : ''}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {student.verificationDate.toString()}
                    </div>
                    {student.verificationNotes && (
                      <div className="text-xs italic mt-1 text-gray-600 dark:text-gray-400">
                        "{student.verificationNotes}"
                      </div>
                    )}
                  </div>
                  <div className="border-l-2 border-blue-500 pl-3">
                    <div className="text-sm text-gray-800 dark:text-gray-200">Data diunggah ke sistem</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {student.createdAt.toString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-l-2 border-blue-500 pl-3">
                  <div className="text-sm text-gray-800 dark:text-gray-200">Data diunggah ke sistem</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {student.createdAt.toString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailModal;
