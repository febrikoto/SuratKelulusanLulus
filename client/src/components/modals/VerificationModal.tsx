import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@shared/schema';
import { Loader2 } from 'lucide-react';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: number;
  mode: 'verify' | 'reject';
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ 
  isOpen, 
  onClose, 
  studentId,
  mode 
}) => {
  const [notes, setNotes] = React.useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: student, isLoading } = useQuery<Student>({
    queryKey: studentId ? [`/api/students/${studentId}`] : ['no-student'],
    enabled: !!studentId && isOpen,
  });

  const verificationMutation = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error('No student selected');
      
      const res = await apiRequest('POST', '/api/students/verify', {
        studentId,
        status: mode === 'verify' ? 'verified' : 'rejected',
        verificationNotes: notes
      });
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: mode === 'verify' 
          ? "Student data has been verified" 
          : "Student data has been rejected",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${studentId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setNotes('');
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verificationMutation.mutate();
  };

  const title = mode === 'verify' ? 'Verifikasi Data Siswa' : 'Tolak Data Siswa';
  const buttonText = mode === 'verify' ? 'Verifikasi' : 'Tolak Data';
  const buttonClass = mode === 'verify' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
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
          <form onSubmit={handleSubmit}>
            <div className="space-y-3 mb-4">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Nama:</span>
                <span className="ml-2 text-gray-800 dark:text-gray-200">{student.fullName}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">NISN:</span>
                <span className="ml-2 text-gray-800 dark:text-gray-200">{student.nisn}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Kelas:</span>
                <span className="ml-2 text-gray-800 dark:text-gray-200">{student.className}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="mb-2 text-gray-700 dark:text-gray-300">
                {mode === 'verify' 
                  ? 'Apakah Anda yakin ingin memverifikasi data siswa ini?' 
                  : 'Apakah Anda yakin ingin menolak data siswa ini?'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mode === 'verify'
                  ? 'Data yang telah diverifikasi akan dapat dicetak sebagai SKL.'
                  : 'Data yang ditolak perlu diperbaiki sebelum dapat diverifikasi.'}
              </p>
            </div>
            
            <div className="mb-4">
              <Label htmlFor="verificationNotes" className="mb-1">
                Catatan {mode === 'reject' && <span className="text-red-500">*</span>}
              </Label>
              <Textarea 
                id="verificationNotes" 
                rows={3} 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={mode === 'verify' 
                  ? "Tambahkan catatan jika diperlukan" 
                  : "Berikan alasan mengapa data ditolak"}
                required={mode === 'reject'}
              />
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Batal
              </Button>
              <Button 
                type="submit"
                className={buttonClass}
                disabled={verificationMutation.isPending || (mode === 'reject' && !notes)}
              >
                {verificationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  buttonText
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VerificationModal;
