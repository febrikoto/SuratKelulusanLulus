import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeleteOption {
  id: string;
  label: string;
  description: string;
  warning: string;
}

const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  // Options available for deletion
  const deleteOptions: DeleteOption[] = [
    {
      id: 'students',
      label: 'Siswa',
      description: 'Hapus semua data siswa',
      warning: 'Semua data siswa akan dihapus secara permanen!'
    },
    {
      id: 'subjects',
      label: 'Mata Pelajaran',
      description: 'Hapus semua mata pelajaran',
      warning: 'Semua mata pelajaran akan dihapus secara permanen!'
    },
    {
      id: 'grades',
      label: 'Nilai',
      description: 'Hapus semua data nilai siswa',
      warning: 'Semua nilai siswa akan dihapus secara permanen!'
    },
    {
      id: 'logs',
      label: 'Logs',
      description: 'Hapus data log sistem',
      warning: 'Semua log sistem akan dihapus secara permanen!'
    }
  ];
  
  // Mutation for bulk deletion
  const bulkDeleteMutation = useMutation({
    mutationFn: async (options: string[]) => {
      const response = await apiRequest('POST', '/api/admin/bulk-delete', { targets: options });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Data berhasil dihapus',
        description: `${data.deleted} item telah dihapus`,
      });
      
      // Invalidate relevant queries based on deleted items
      if (selectedOptions.includes('students')) {
        queryClient.invalidateQueries({ queryKey: ['/api/students'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      }
      if (selectedOptions.includes('subjects')) {
        queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      }
      if (selectedOptions.includes('grades')) {
        queryClient.invalidateQueries({ queryKey: ['/api/grades'] });
      }
      
      // Reset and close
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal menghapus data',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const handleToggleOption = (id: string) => {
    setSelectedOptions(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };
  
  const handleProceed = () => {
    if (selectedOptions.length === 0) {
      toast({
        title: 'Tidak ada data yang dipilih',
        description: 'Silahkan pilih minimal satu jenis data untuk dihapus',
        variant: 'destructive',
      });
      return;
    }
    
    setIsConfirmStep(true);
  };
  
  const handleConfirmDelete = () => {
    if (confirmText !== 'HAPUS') {
      toast({
        title: 'Konfirmasi tidak sesuai',
        description: 'Ketik "HAPUS" untuk mengkonfirmasi penghapusan data',
        variant: 'destructive',
      });
      return;
    }
    
    bulkDeleteMutation.mutate(selectedOptions);
  };
  
  const handleCloseModal = () => {
    setSelectedOptions([]);
    setIsConfirmStep(false);
    setConfirmText('');
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isConfirmStep ? 'Konfirmasi Penghapusan' : 'Pilih data yang akan dihapus'}
          </DialogTitle>
          <DialogDescription>
            {isConfirmStep 
              ? 'Tindakan ini tidak dapat dibatalkan. Data yang dihapus tidak dapat dikembalikan.'
              : 'Pilih kategori data yang ingin dihapus secara permanen.'}
          </DialogDescription>
        </DialogHeader>
        
        {!isConfirmStep ? (
          <div className="space-y-4 py-4">
            {deleteOptions.map((option) => (
              <div key={option.id} className="flex items-start space-x-2">
                <Checkbox
                  id={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onCheckedChange={() => handleToggleOption(option.id)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor={option.id}
                    className="text-base"
                  >
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800">Peringatan!</p>
                <ul className="text-xs text-amber-700 list-disc pl-4">
                  {selectedOptions.map(optionId => {
                    const option = deleteOptions.find(o => o.id === optionId);
                    return option ? (
                      <li key={optionId}>
                        {option.warning}
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-text">
                Ketik "HAPUS" untuk mengkonfirmasi:
              </Label>
              <input
                id="confirm-text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="HAPUS"
              />
            </div>
          </div>
        )}
        
        <DialogFooter className="flex space-x-2 sm:space-x-0">
          <Button variant="outline" onClick={handleCloseModal}>
            Batal
          </Button>
          
          {!isConfirmStep ? (
            <Button onClick={handleProceed} disabled={selectedOptions.length === 0}>
              Lanjutkan
            </Button>
          ) : (
            <Button 
              onClick={handleConfirmDelete} 
              variant="destructive"
              disabled={bulkDeleteMutation.isPending}
              className="gap-1"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Hapus Data</span>
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDeleteModal;