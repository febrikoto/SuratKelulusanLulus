import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const importCsvMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/students/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import data');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Successfully imported ${data.imported} students`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setFile(null);
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

  const downloadTemplate = () => {
    const headers = ['nisn,nis,fullName,birthPlace,birthDate,parentName,className'];
    const csvContent = headers.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'students_template.csv');
    a.click();
    
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    importCsvMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Data Siswa (CSV)</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Upload file CSV dengan format: NISN, NIS, Nama Lengkap, Tempat Lahir, Tanggal Lahir, Nama Orang Tua, Kelas
            </p>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center">
              <input 
                type="file" 
                id="csvFile" 
                className="hidden" 
                accept=".csv"
                onChange={handleFileChange} 
              />
              <label htmlFor="csvFile" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Klik untuk memilih file CSV</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">atau drag & drop file di sini</p>
              </label>
              
              {file && (
                <div className="mt-2 text-sm text-primary font-medium">
                  {file.name}
                </div>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <Button 
              type="button" 
              variant="link" 
              onClick={downloadTemplate}
              size="sm"
              className="p-0"
            >
              Download template CSV
            </Button>
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
              disabled={!file || importCsvMutation.isPending}
            >
              {importCsvMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ImportCsvModal;
