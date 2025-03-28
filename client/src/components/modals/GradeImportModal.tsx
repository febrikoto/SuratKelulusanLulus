import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
  Info,
  FileText,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { Subject } from '@shared/schema';

interface GradeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GradeImportData {
  nisn: string;
  subjectName: string;
  value: number;
}

interface ImportError {
  nisn: string;
  error: string;
  row?: number;
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
  const [activeTab, setActiveTab] = useState('upload');
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [subjectStats, setSubjectStats] = useState<{[key: string]: number}>({});
  const [studentStats, setStudentStats] = useState<{[key: string]: number}>({}); 
  
  // Fetch subjects for validation
  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
    enabled: isOpen
  });
  
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
      // Clear previous errors and stats
      setImportErrors([]);
      setSubjectStats({});
      setStudentStats({});
      
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
        const errors: ImportError[] = [];
        const subjectCounts: {[key: string]: number} = {};
        const studentCounts: {[key: string]: number} = {};
        
        rows.forEach((row: any, index: number) => {
          if (!row.nisn || !row.subjectName || row.value === undefined) {
            errors.push({
              nisn: row.nisn || 'N/A',
              error: 'Data tidak lengkap (nisn, subjectName, atau value)',
              row: index + 2
            });
            return;
          }
          
          // Validate NISN
          const nisn = String(row.nisn);
          if (nisn.length < 5) {
            errors.push({
              nisn,
              error: 'Format NISN tidak valid',
              row: index + 2
            });
            return;
          }
          
          // Validate subject name
          const subjectName = String(row.subjectName);
          if (subjectName.trim() === '') {
            errors.push({
              nisn,
              error: 'Nama mata pelajaran tidak boleh kosong',
              row: index + 2
            });
            return;
          }
          
          // Optional: Validate against registered subjects
          if (subjects && subjects.length > 0) {
            const subjectExists = subjects.some(s => 
              s.name.toLowerCase() === subjectName.toLowerCase() ||
              (s.code && s.code.toLowerCase() === subjectName.toLowerCase())
            );
            
            if (!subjectExists) {
              // Add warning but still include the data
              errors.push({
                nisn,
                error: `Mata pelajaran "${subjectName}" tidak terdaftar dalam database (akan dibuat otomatis)`,
                row: index + 2
              });
            }
          }
          
          // Validate value
          const value = Number(row.value);
          if (isNaN(value) || value < 0 || value > 100) {
            errors.push({
              nisn,
              error: 'Nilai harus berupa angka 0-100',
              row: index + 2
            });
            return;
          }
          
          // Track statistics
          if (subjectCounts[subjectName]) {
            subjectCounts[subjectName]++;
          } else {
            subjectCounts[subjectName] = 1;
          }
          
          if (studentCounts[nisn]) {
            studentCounts[nisn]++;
          } else {
            studentCounts[nisn] = 1;
          }
          
          // Add valid data
          grades.push({
            nisn: String(row.nisn),
            subjectName: String(row.subjectName),
            value
          });
        });
        
        // Set all data
        setPreviewData(grades);
        setImportErrors(errors);
        setSubjectStats(subjectCounts);
        setStudentStats(studentCounts);
        setIsPreviewReady(true);
        
        // Show summary toast notification
        if (errors.length > 0) {
          toast({
            title: 'Validasi selesai dengan peringatan',
            description: `${grades.length} data siap di-import, ${errors.length} data memiliki masalah. Silahkan cek tab Peringatan.`,
            variant: 'default' // Changed from 'warning' to fix type error
          });
        } else if (grades.length > 0) {
          toast({
            title: 'Validasi berhasil',
            description: `${grades.length} data nilai siap di-import untuk ${Object.keys(studentCounts).length} siswa.`,
          });
        } else {
          toast({
            title: 'Tidak ada data valid',
            description: 'Tidak ada data nilai yang valid untuk diimport',
            variant: 'destructive'
          });
        }
        
        // Switch to preview tab if we have data
        if (grades.length > 0) {
          setActiveTab('preview');
        } else if (errors.length > 0) {
          setActiveTab('errors');
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
    try {
      // Create empty workbook
      const wb = XLSX.utils.book_new();
      
      // First create a worksheet with instructions
      const instructionData = [
        ['PETUNJUK PENGISIAN TEMPLATE NILAI'],
        [''],
        ['1. Jangan mengubah format kolom yang sudah ada'],
        ['2. Kolom NISN harus terisi dengan NISN siswa yang terdaftar'],
        ['3. Nilai harus berupa angka antara 0-100'],
        ['4. Satu siswa dapat memiliki beberapa nilai mata pelajaran'],
        [''],
        ['FORMAT DATA:'],
        [''],
        ['nisn', 'subjectName', 'value'],
      ];
      
      const instructionWs = XLSX.utils.aoa_to_sheet(instructionData);
      XLSX.utils.book_append_sheet(wb, instructionWs, "Petunjuk");
      
      // Define sample data structure
      const sampleData = templateData?.sample || [
        { nisn: '1234567890', subjectName: 'Matematika', value: 85 },
        { nisn: '1234567890', subjectName: 'Bahasa Indonesia', value: 90 },
        { nisn: '0987654321', subjectName: 'Matematika', value: 75 },
        { nisn: '0987654321', subjectName: 'Bahasa Indonesia', value: 88 },
      ];
      
      // Create data worksheet
      const dataWs = XLSX.utils.json_to_sheet(sampleData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, dataWs, "Data Nilai");
      
      // Export the workbook to a file and download it
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      // Create a Blob from the array
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_nilai.xlsx';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      toast({
        title: 'Template Excel berhasil dibuat',
        description: 'Silahkan isi template sesuai format yang disediakan',
      });
    } catch (error) {
      console.error('Error generating Excel template:', error);
      toast({
        title: 'Gagal membuat template',
        description: 'Terjadi kesalahan saat membuat template Excel',
        variant: 'destructive'
      });
    }
  };

  // Helper function to generate badge for number of items
  const getCountBadge = (count: number) => {
    if (count === 0) return null;
    return (
      <Badge 
        variant={count > 0 ? "secondary" : "outline"} 
        className="ml-1.5"
      >
        {count}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import Nilai dari Excel</DialogTitle>
          <DialogDescription>
            Upload file Excel dengan data nilai siswa
          </DialogDescription>
        </DialogHeader>
        
        {!file && (
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
          </div>
        )}
        
        {file && (
          <div className="py-4">
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
                  setImportErrors([]);
                  setIsPreviewReady(false);
                  setActiveTab('upload');
                }}
              >
                Ganti File
              </Button>
            </div>
            
            {isPreviewReady && (
              <>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-3 mb-4">
                    <TabsTrigger value="preview" disabled={previewData.length === 0}>
                      Data Nilai {getCountBadge(previewData.length)}
                    </TabsTrigger>
                    <TabsTrigger value="errors" disabled={importErrors.length === 0}>
                      Peringatan {getCountBadge(importErrors.length)}
                    </TabsTrigger>
                    <TabsTrigger value="stats" disabled={previewData.length === 0}>
                      Statistik
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="preview" className="mt-0">
                    <div className="rounded-md border h-60 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">NISN</TableHead>
                            <TableHead>Mata Pelajaran</TableHead>
                            <TableHead className="text-right w-[80px]">Nilai</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.length > 0 ? (
                            previewData.slice(0, 100).map((grade, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono">{grade.nisn}</TableCell>
                                <TableCell>{grade.subjectName}</TableCell>
                                <TableCell className="text-right">{grade.value}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                Tidak ada data yang valid
                              </TableCell>
                            </TableRow>
                          )}
                          {previewData.length > 100 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                ...dan {previewData.length - 100} data lainnya
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                      <span>Total {previewData.length} nilai untuk {Object.keys(studentStats).length} siswa</span>
                      {previewData.length > 0 && (
                        <Button size="sm" variant="ghost" className="h-8">
                          <Download className="h-4 w-4 mr-1" />
                          Export Nilai
                        </Button>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="errors" className="mt-0">
                    <div className="rounded-md border h-60 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Baris</TableHead>
                            <TableHead className="w-[100px]">NISN</TableHead>
                            <TableHead>Pesan Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importErrors.length > 0 ? (
                            importErrors.map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.row || '-'}</TableCell>
                                <TableCell className="font-mono">{error.nisn}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                                    {error.error}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                Tidak ada error atau peringatan
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {importErrors.length > 0 && (
                      <div className="mt-2 text-sm text-amber-600">
                        Peringatan: Data dengan error ringan tetap akan diimpor. Perbaiki file Excel jika terdapat error yang perlu diperbaiki.
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="stats" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-md border p-4">
                        <h4 className="font-medium mb-2 text-sm">Statistik Mata Pelajaran</h4>
                        <div className="h-40 overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Mata Pelajaran</TableHead>
                                <TableHead className="text-right">Jumlah Nilai</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.keys(subjectStats).length > 0 ? (
                                Object.entries(subjectStats)
                                  .sort(([, countA], [, countB]) => countB - countA)
                                  .map(([subject, count]) => (
                                    <TableRow key={subject}>
                                      <TableCell>{subject}</TableCell>
                                      <TableCell className="text-right">{count}</TableCell>
                                    </TableRow>
                                  ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                                    Tidak ada data
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      
                      <div className="rounded-md border p-4">
                        <h4 className="font-medium mb-2 text-sm">Statistik Siswa</h4>
                        <div className="h-40 overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>NISN</TableHead>
                                <TableHead className="text-right">Jumlah Nilai</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.keys(studentStats).length > 0 ? (
                                Object.entries(studentStats)
                                  .sort(([, countA], [, countB]) => countB - countA)
                                  .map(([nisn, count]) => (
                                    <TableRow key={nisn}>
                                      <TableCell className="font-mono">{nisn}</TableCell>
                                      <TableCell className="text-right">{count}</TableCell>
                                    </TableRow>
                                  ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                                    Tidak ada data
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}
        
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
                Mengimpor...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import {previewData.length} Nilai
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GradeImportModal;