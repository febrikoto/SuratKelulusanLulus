import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileSpreadsheet, FileDown } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [className, setClassName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Validate file type helper
  const isValidFileType = (file: File): boolean => {
    return file.name.endsWith('.csv') || file.name.endsWith('.xlsx');
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (isValidFileType(selectedFile)) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Format File Salah",
          description: "Hanya file CSV atau Excel (.xlsx) yang diperbolehkan",
          variant: "destructive",
        });
      }
    }
  };
  
  // Handle file upload button click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
        title: "Sukses",
        description: `Berhasil mengimpor ${data.imported} siswa`,
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

  const downloadCsvTemplate = () => {
    const headers = ['nisn,nis,fullName,birthPlace,birthDate,parentName,className'];
    const csvContent = headers.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'template_siswa.csv');
    a.click();
    
    URL.revokeObjectURL(url);
  };
  
  const downloadExcelTemplate = () => {
    if (!className || className.trim() === '') {
      toast({
        title: "Peringatan",
        description: "Silakan isi nama kelas terlebih dahulu",
        variant: "destructive",
      });
      return;
    }
    
    window.location.href = `/api/students/template/excel?className=${encodeURIComponent(className)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    importCsvMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Data Siswa</DialogTitle>
          <DialogDescription>
            Tambahkan data siswa secara massal dengan menggunakan file CSV atau Excel
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="import" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import File</TabsTrigger>
            <TabsTrigger value="template">Download Template</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto pr-1">
            <TabsContent value="import" className="mt-4 h-full">
              <form onSubmit={handleSubmit} className="h-full flex flex-col">
                <div className="mb-4 flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Upload file CSV atau Excel dengan format: NISN, NIS, Nama Lengkap, Tempat Lahir, Tanggal Lahir, Nama Orang Tua, Kelas
                  </p>
                  
                  <div className="mt-4">
                    {/* File input hidden but accessible */}
                    <input 
                      type="file" 
                      id="csvFile"
                      ref={fileInputRef}
                      className="hidden" 
                      accept=".csv,.xlsx"
                      onChange={handleFileChange} 
                    />
                    
                    {/* Simple upload button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full py-8 flex flex-col items-center justify-center"
                      onClick={handleUploadClick}
                    >
                      <Upload className="h-10 w-10 mb-2" />
                      <span className="text-sm">
                        Klik di sini untuk memilih file CSV atau Excel
                      </span>
                    </Button>
                    
                    {file && (
                      <div className="mt-2 text-sm text-primary font-medium flex items-center justify-center">
                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                        {file.name}
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter className="sticky bottom-0 bg-background pt-2 mt-auto">
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
                        Mengimpor...
                      </>
                    ) : (
                      'Import'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="template" className="mt-4 h-full">
              <div className="space-y-4 py-2 h-full flex flex-col">
                <div className="space-y-2 flex-1 overflow-y-auto">
                  <Label htmlFor="className">Nama Kelas (untuk Template Excel)</Label>
                  <Input 
                    id="className" 
                    placeholder="Contoh: XII MIPA 1" 
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Masukkan nama kelas untuk membuat template Excel per kelas
                  </p>
                
                  <div className="flex flex-col space-y-2 mt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={downloadExcelTemplate}
                      className="flex items-center"
                      disabled={!className || className.trim() === ''}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download Template Excel
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={downloadCsvTemplate}
                      className="flex items-center"
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Download Template CSV
                    </Button>
                  </div>
                </div>
                
                <DialogFooter className="sticky bottom-0 bg-background pt-2 mt-auto">
                  <Button type="button" onClick={onClose}>
                    Tutup
                  </Button>
                </DialogFooter>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ImportCsvModal;