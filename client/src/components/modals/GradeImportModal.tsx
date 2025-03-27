import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  UploadCloud, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  FileDown, 
  HelpCircle,
  Info
} from 'lucide-react';

interface GradeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GradeImportData {
  nisn: string;
  subjectName: string;
  value: number;
}

const GradeImportModal: React.FC<GradeImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<GradeImportData[]>([]);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  
  // Import grades mutation
  const importGradesMutation = useMutation({
    mutationFn: async (data: GradeImportData[]) => {
      const response = await apiRequest('POST', '/api/grades/import', data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Nilai berhasil diimport',
        description: `${data.success} data nilai berhasil disimpan`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast({
        title: 'Gagal mengimport nilai',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const validateFile = (file: File): boolean => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (!validTypes.includes(file.type)) {
      setFileError('Format file tidak valid. Harap upload file Excel (.xlsx, .xls) atau CSV');
      return false;
    }
    
    // Reset errors
    setFileError(null);
    return true;
  };
  
  const parseExcelFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const rows = XLSX.utils.sheet_to_json(worksheet);
        
        if (rows.length === 0) {
          setFileError('File tidak memiliki data');
          return;
        }
        
        // Check if required columns exist
        const firstRow = rows[0] as any;
        if (!firstRow.nisn || !firstRow.subjectName || !firstRow.value) {
          setFileError('Format file tidak sesuai. Kolom yang diperlukan: nisn, subjectName, value');
          return;
        }
        
        // Parse and validate data
        const grades: GradeImportData[] = [];
        let hasErrors = false;
        
        rows.forEach((row: any, index: number) => {
          if (!row.nisn || !row.subjectName || row.value === undefined) {
            toast({
              title: 'Data tidak lengkap',
              description: `Baris ${index + 2}: Data nisn, subjectName, atau value tidak lengkap`,
              variant: 'destructive',
            });
            hasErrors = true;
            return;
          }
          
          // Validate NISN
          const nisn = String(row.nisn);
          if (nisn.length < 5) {
            toast({
              title: 'NISN tidak valid',
              description: `Baris ${index + 2}: Format NISN tidak valid`,
              variant: 'destructive',
            });
            hasErrors = true;
            return;
          }
          
          // Validate subject name
          const subjectName = String(row.subjectName);
          if (subjectName.trim() === '') {
            toast({
              title: 'Nama mata pelajaran kosong',
              description: `Baris ${index + 2}: Nama mata pelajaran tidak boleh kosong`,
              variant: 'destructive',
            });
            hasErrors = true;
            return;
          }
          
          // Validate value
          const value = Number(row.value);
          if (isNaN(value) || value < 0 || value > 100) {
            toast({
              title: 'Nilai tidak valid',
              description: `Baris ${index + 2}: Nilai harus berupa angka 0-100`,
              variant: 'destructive',
            });
            hasErrors = true;
            return;
          }
          
          grades.push({
            nisn: String(row.nisn),
            subjectName: String(row.subjectName),
            value
          });
        });
        
        if (!hasErrors) {
          setPreviewData(grades);
          setIsPreviewReady(true);
          
          if (grades.length === 0) {
            toast({
              title: 'File kosong',
              description: 'Tidak ada data nilai yang valid untuk diimport',
              variant: 'destructive',
            });
          }
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setFileError('Gagal membaca file. Pastikan format file sesuai');
      setFile(null);
    }
  };
  
  const handleImport = () => {
    if (previewData.length > 0) {
      importGradesMutation.mutate(previewData);
    } else {
      toast({
        title: 'Tidak ada data',
        description: 'Tidak ada data nilai yang valid untuk diimport',
        variant: 'destructive',
      });
    }
  };
  
  const handleCloseModal = () => {
    setFile(null);
    setFileError(null);
    setPreviewData([]);
    setIsPreviewReady(false);
    onClose();
  };
  
  // Function to fetch template data from API and generate Excel file
  const { data: templateData } = useQuery({
    queryKey: ['/api/grades/template'],
    queryFn: async () => {
      const response = await fetch('/api/grades/template');
      if (!response.ok) {
        throw new Error('Failed to fetch template data');
      }
      return response.json();
    },
    enabled: isOpen, // Only fetch when modal is open
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
  
  // Function to generate and download template Excel file
  const generateExcelTemplate = () => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Define data structure with sample data (fallback if API fails)
    const sampleData = templateData?.sample || [
      { nisn: '1234567890', subjectName: 'Matematika', value: 85 },
      { nisn: '1234567890', subjectName: 'Bahasa Indonesia', value: 90 },
      { nisn: '0987654321', subjectName: 'Matematika', value: 75 },
      { nisn: '0987654321', subjectName: 'Bahasa Indonesia', value: 88 },
    ];
    
    // Create worksheet from data
    const ws = XLSX.utils.json_to_sheet(sampleData);
    
    // Add column width information and formatting
    const wscols = [
      {wch: 15}, // NISN
      {wch: 30}, // Nama Mata Pelajaran
      {wch: 10}, // Nilai
    ];
    
    // Set column widths
    ws['!cols'] = wscols;
    
    // Add header style
    // Note: XLSX doesn't support direct cell styling in this version, 
    // but we can add a brief instructions row at the top
    XLSX.utils.sheet_add_aoa(ws, [
      ['==== PETUNJUK PENGISIAN TEMPLATE NILAI ===='],
      ['1. Jangan mengubah format kolom yang sudah ada'],
      ['2. Kolom NISN harus terisi dengan NISN siswa yang terdaftar'],
      ['3. Nilai harus berupa angka antara 0-100'],
      ['4. Satu siswa dapat memiliki beberapa nilai mata pelajaran'],
      ['']
    ], { origin: 'A1' });
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Template Nilai");
    
    // Generate and download the Excel file
    XLSX.writeFile(wb, "template_nilai.xlsx");
    
    toast({
      title: 'Template Excel berhasil dibuat',
      description: 'Silahkan isi template sesuai format yang disediakan',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Nilai dari Excel</DialogTitle>
          <DialogDescription>
            Upload file Excel dengan data nilai siswa
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-3">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1 text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">Format Import Nilai Excel</p>
                <p className="text-xs">1. NISN: Nomor Induk Siswa Nasional yang terdaftar</p>
                <p className="text-xs">2. SubjectName: Nama mata pelajaran</p>
                <p className="text-xs">3. Value: Nilai dalam bentuk angka (0-100)</p>
                <div className="flex justify-end mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateExcelTemplate}
                    className="flex items-center bg-white dark:bg-gray-800"
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    <span>Download Template</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {!file && (
            <div 
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                fileError ? 'border-red-300' : 'border-gray-300'
              }`}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    if (validateFile(selectedFile)) {
                      setFile(selectedFile);
                      parseExcelFile(selectedFile);
                    }
                  }
                }}
              />
              <div className="flex flex-col items-center">
                {fileError ? (
                  <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
                ) : (
                  <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                )}
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {fileError || 'Klik untuk upload file Excel (.xlsx, .xls) atau CSV'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Format kolom: nisn, subjectName, value
                </p>
              </div>
            </div>
          )}
          
          {file && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  {isPreviewReady ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                  )}
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreviewData([]);
                    setIsPreviewReady(false);
                  }}
                >
                  Ganti File
                </Button>
              </div>
              
              {isPreviewReady && (
                <div>
                  <p className="text-sm mb-2">
                    Jumlah data: <span className="font-medium">{previewData.length}</span> nilai
                  </p>
                  <div className="text-xs text-gray-500">
                    {previewData.length > 0 && (
                      <p>File berisi nilai untuk {new Set(previewData.map(d => d.nisn)).size} siswa</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={handleCloseModal}
            className="mb-2 sm:mb-0"
          >
            Batal
          </Button>
          <Button
            onClick={handleImport}
            disabled={!isPreviewReady || previewData.length === 0 || importGradesMutation.isPending}
          >
            {importGradesMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Nilai'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GradeImportModal;