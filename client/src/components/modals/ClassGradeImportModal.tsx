import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Subject, Student } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  FileSpreadsheet,
  School
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClassGradeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GradeData {
  studentId: number;
  nisn: string;
  nis: string;
  fullName: string;
  [subjectCode: string]: any; // Untuk nilai mata pelajaran dinamis
}

interface ImportError {
  row: number;
  column: string;
  studentName?: string;
  nisn?: string;
  error: string;
}

interface SubjectColumn {
  code: string;
  name: string;
  id?: number;
}

const ClassGradeImportModal: React.FC<ClassGradeImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<GradeData[]>([]);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [subjectColumns, setSubjectColumns] = useState<SubjectColumn[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Fetch subjects
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
    enabled: isOpen
  });
  
  // Fetch all students
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    enabled: isOpen
  });
  
  // Fetch class list from settings
  const { data: settings } = useQuery<any>({
    queryKey: ['/api/settings'],
    enabled: isOpen
  });
  
  // Extract class list
  const classList = settings?.classList ? settings.classList.split(',') : [];
  
  // Import grades mutation
  const importGradesMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/grades/import-class', data);
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
    ];
    
    if (!validTypes.includes(file.type)) {
      setFileError('Format file tidak valid. Harap upload file Excel (.xlsx, .xls)');
      return false;
    }
    
    // Reset errors
    setFileError(null);
    return true;
  };
  
  const parseExcelFile = async (file: File) => {
    if (!selectedClass) {
      toast({
        title: 'Pilih Kelas',
        description: 'Silahkan pilih kelas terlebih dahulu sebelum mengupload file',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsUploading(true);
      // Clear previous errors and stats
      setImportErrors([]);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });
          
          if (rows.length <= 1) {
            setFileError('File tidak memiliki data');
            setIsUploading(false);
            return;
          }
          
          // Get header row - row 1 is the header
          const headerRow = rows[0] as any;
          const headerKeys = Object.keys(headerRow).filter(key => key !== '__rowNum__');
          
          // Define expected columns
          const expectedBaseColumns = ['nisn', 'nis', 'nama'];
          
          // Check if required base columns exist
          const hasRequiredColumns = expectedBaseColumns.every(col => {
            return Object.values(headerRow).some(
              val => typeof val === 'string' && val.toLowerCase().includes(col)
            );
          });
          
          if (!hasRequiredColumns) {
            setFileError('Format file tidak sesuai. Kolom yang diperlukan: NISN, NIS, Nama Siswa, dan minimal satu mata pelajaran');
            setIsUploading(false);
            return;
          }
          
          // Map header indices to column names
          const columnMap: Record<string, string> = {};
          const subjectCols: SubjectColumn[] = [];
          
          headerKeys.forEach(key => {
            const value = headerRow[key];
            if (typeof value === 'string') {
              const lowerValue = value.toLowerCase().trim();
              if (lowerValue.includes('nisn')) {
                columnMap[key] = 'nisn';
              } else if (lowerValue.includes('nis') && !lowerValue.includes('nisn')) {
                columnMap[key] = 'nis';
              } else if (lowerValue.includes('nama')) {
                columnMap[key] = 'fullName';
              } else {
                // This might be a subject column
                // Try to match with existing subjects
                const matchedSubject = subjects.find(s => 
                  lowerValue.includes(s.name.toLowerCase()) || 
                  (s.code && lowerValue.includes(s.code.toLowerCase()))
                );
                
                if (matchedSubject) {
                  columnMap[key] = matchedSubject.code;
                  subjectCols.push({
                    code: matchedSubject.code,
                    name: matchedSubject.name,
                    id: matchedSubject.id
                  });
                } else {
                  // Create a code from subject name
                  const code = value.replace(/[^A-Z0-9]/gi, '').substring(0, 5).toUpperCase();
                  columnMap[key] = code;
                  subjectCols.push({
                    code,
                    name: value
                  });
                }
              }
            }
          });
          
          setSubjectColumns(subjectCols);
          
          if (subjectCols.length === 0) {
            setFileError('Tidak ada kolom mata pelajaran yang terdeteksi');
            setIsUploading(false);
            return;
          }
          
          // Parse and validate data rows
          const grades: GradeData[] = [];
          const errors: ImportError[] = [];
          
          // Get students from the selected class
          const classStudents = students.filter(s => s.className === selectedClass);
          
          // Skip header row (start from index 1)
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i] as any;
            const rowNum = i + 1; // Excel row number (1-based)
            
            if (!row || Object.keys(row).filter(k => k !== '__rowNum__').length === 0) {
              continue; // Skip empty rows
            }
            
            const gradeData: GradeData = {
              studentId: 0,
              nisn: '',
              nis: '',
              fullName: ''
            };
            
            // Extract student info
            let hasStudentIdentifier = false;
            
            headerKeys.forEach(key => {
              const colType = columnMap[key];
              const value = row[key];
              
              if (!value && !['nisn', 'nis', 'fullName'].includes(colType)) {
                return; // Skip empty subject values
              }
              
              if (colType === 'nisn' || colType === 'nis' || colType === 'fullName') {
                if (value) {
                  gradeData[colType] = String(value).trim();
                  hasStudentIdentifier = true;
                }
              } else if (colType) {
                // This is a subject column
                if (value !== undefined && value !== '') {
                  // Validate subject grade
                  const numValue = Number(value);
                  if (isNaN(numValue) || numValue < 0 || numValue > 100) {
                    errors.push({
                      row: rowNum,
                      column: headerRow[key],
                      studentName: gradeData.fullName,
                      nisn: gradeData.nisn,
                      error: `Nilai harus berupa angka 0-100, ditemukan: ${value}`
                    });
                  } else {
                    gradeData[colType] = numValue;
                  }
                }
              }
            });
            
            // Validate student identifiers
            if (!hasStudentIdentifier) {
              errors.push({
                row: rowNum,
                column: 'NISN/NIS/Nama',
                error: 'Baris tidak berisi identitas siswa'
              });
              continue;
            }
            
            // Find matching student
            let matchedStudent: Student | undefined;
            
            if (gradeData.nisn) {
              matchedStudent = classStudents.find(s => s.nisn === gradeData.nisn);
            }
            
            if (!matchedStudent && gradeData.nis) {
              matchedStudent = classStudents.find(s => s.nis === gradeData.nis);
            }
            
            if (!matchedStudent && gradeData.fullName) {
              // Try fuzzy match with name
              matchedStudent = classStudents.find(s => 
                s.fullName.toLowerCase() === gradeData.fullName.toLowerCase()
              );
            }
            
            if (!matchedStudent) {
              errors.push({
                row: rowNum,
                column: 'NISN/NIS/Nama',
                studentName: gradeData.fullName,
                nisn: gradeData.nisn,
                error: `Siswa tidak ditemukan di kelas ${selectedClass}`
              });
              continue;
            }
            
            // Add student ID
            gradeData.studentId = matchedStudent.id;
            gradeData.nisn = matchedStudent.nisn;
            gradeData.nis = matchedStudent.nis;
            gradeData.fullName = matchedStudent.fullName;
            
            // Check if student has any subject grades
            const hasGrades = subjectCols.some(col => gradeData[col.code] !== undefined);
            
            if (!hasGrades) {
              errors.push({
                row: rowNum,
                column: 'Semua kolom nilai',
                studentName: gradeData.fullName,
                nisn: gradeData.nisn,
                error: 'Tidak ada nilai mata pelajaran yang diisi'
              });
              continue;
            }
            
            grades.push(gradeData);
          }
          
          // Set all data
          setPreviewData(grades);
          setImportErrors(errors);
          setIsPreviewReady(true);
          setIsUploading(false);
          
          // Show summary toast notification
          if (errors.length > 0) {
            toast({
              title: 'Validasi selesai dengan peringatan',
              description: `${grades.length} siswa siap di-import nilai, ${errors.length} peringatan ditemukan. Silahkan cek tab Peringatan.`,
              variant: 'default'
            });
          } else if (grades.length > 0) {
            toast({
              title: 'Validasi berhasil',
              description: `Data nilai siap di-import untuk ${grades.length} siswa kelas ${selectedClass}.`,
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
        } catch (error) {
          console.error('Error parsing Excel data:', error);
          setFileError('Gagal membaca file. Pastikan format file sesuai');
          setIsUploading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setFileError('Gagal membaca file. Pastikan format file sesuai');
      setFile(null);
      setIsUploading(false);
    }
  };
  
  const handleImport = () => {
    if (previewData.length > 0 && subjectColumns.length > 0) {
      // Create structured data for import
      const importData = {
        students: previewData,
        subjects: subjectColumns,
        className: selectedClass
      };
      
      importGradesMutation.mutate(importData);
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
    setSelectedClass(null);
    setActiveTab('upload');
    setImportErrors([]);
    setSubjectColumns([]);
    onClose();
  };
  
  // Function to generate and download template Excel file
  const generateExcelTemplate = () => {
    if (!selectedClass) {
      toast({
        title: 'Pilih Kelas',
        description: 'Silahkan pilih kelas terlebih dahulu sebelum mengunduh template',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Get students from the selected class
      const classStudents = students.filter(s => s.className === selectedClass);
      
      if (classStudents.length === 0) {
        toast({
          title: 'Tidak ada siswa',
          description: `Tidak ada siswa terdaftar di kelas ${selectedClass}`,
          variant: 'destructive',
        });
        return;
      }
      
      // Create empty workbook
      const wb = XLSX.utils.book_new();
      
      // First create a worksheet with instructions
      const instructionData = [
        ['TEMPLATE NILAI KELAS ' + selectedClass],
        [''],
        ['Petunjuk Pengisian:'],
        ['1. Jangan mengubah format kolom yang sudah ada (terutama kolom NISN, NIS, dan Nama Siswa)'],
        ['2. Nilai harus berupa angka antara 0-100'],
        ['3. Kolom yang kosong tidak akan diimport'],
        ['4. Pastikan nama mata pelajaran sudah sesuai dengan yang terdaftar di sistem'],
        ['']
      ];
      
      // Add subject information
      instructionData.push(['Daftar Mata Pelajaran yang Tersedia:']);
      subjects.forEach(subject => {
        instructionData.push([`- ${subject.name} (${subject.code})`]);
      });
      
      instructionData.push(['']);
      
      const instructionWs = XLSX.utils.aoa_to_sheet(instructionData);
      XLSX.utils.book_append_sheet(wb, instructionWs, "Petunjuk");
      
      // Create header for data worksheet
      const headers = ['NISN', 'NIS', 'Nama Siswa'];
      
      // Add subject columns
      subjects.forEach(subject => {
        headers.push(subject.name);
      });
      
      // Create data worksheet with students
      const data = [headers];
      
      classStudents.forEach(student => {
        const row = [
          student.nisn,
          student.nis,
          student.fullName
        ];
        
        // Add empty cells for subjects
        subjects.forEach(() => {
          row.push('');
        });
        
        data.push(row);
      });
      
      const dataWs = XLSX.utils.aoa_to_sheet(data);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, dataWs, `Nilai ${selectedClass}`);
      
      // Export the workbook to a file and download it
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      // Create a Blob from the array
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_nilai_${String(selectedClass).replace(/\s+/g, '_')}.xlsx`;
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
          <DialogTitle>Import Nilai Kelas</DialogTitle>
          <DialogDescription>
            Upload file Excel dengan data nilai siswa untuk satu kelas
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-3">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1 text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">Format Import Nilai Excel Per Kelas</p>
                <p className="text-xs">1. Baris pertama berisi nama kolom (NISN, NIS, Nama, dan nama mata pelajaran)</p>
                <p className="text-xs">2. Setiap baris berikutnya berisi data siswa dan nilai mata pelajaran</p>
                <p className="text-xs">3. Nilai dalam bentuk angka (0-100)</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Pilih Kelas</label>
              <Select
                value={selectedClass || ""}
                onValueChange={(value) => setSelectedClass(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classList.map((className: string) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={generateExcelTemplate}
                className="flex items-center bg-white dark:bg-gray-800 w-full"
                disabled={!selectedClass}
              >
                <FileDown className="h-4 w-4 mr-1" />
                <span>Download Template Nilai {selectedClass}</span>
              </Button>
            </div>
          </div>
          
          {!file && (
            <div 
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                fileError ? 'border-red-300' : 'border-gray-300'
              }`}
              onClick={() => document.getElementById('class-file-upload')?.click()}
            >
              <input
                type="file"
                id="class-file-upload"
                className="hidden"
                accept=".xlsx,.xls"
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
                  {fileError || 'Klik untuk upload file Excel (.xlsx, .xls)'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  File harus berisi daftar siswa dan nilai mata pelajaran
                </p>
              </div>
            </div>
          )}
        </div>
        
        {file && (
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                ) : isPreviewReady ? (
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
                disabled={isUploading}
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
                    <TabsTrigger value="subjects" disabled={subjectColumns.length === 0}>
                      Mata Pelajaran {getCountBadge(subjectColumns.length)}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="preview" className="mt-0">
                    <div className="rounded-md border h-60 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]">No</TableHead>
                            <TableHead className="w-[100px]">NISN</TableHead>
                            <TableHead>Nama Siswa</TableHead>
                            {subjectColumns.slice(0, 3).map((subject) => (
                              <TableHead key={subject.code} className="text-right w-[80px]">
                                {subject.code}
                              </TableHead>
                            ))}
                            {subjectColumns.length > 3 && (
                              <TableHead className="text-right w-[80px]">...</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.length > 0 ? (
                            previewData.slice(0, 50).map((grade, index) => (
                              <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-mono">{grade.nisn}</TableCell>
                                <TableCell>{grade.fullName}</TableCell>
                                {subjectColumns.slice(0, 3).map((subject) => (
                                  <TableCell key={subject.code} className="text-right">
                                    {grade[subject.code] !== undefined ? grade[subject.code] : '-'}
                                  </TableCell>
                                ))}
                                {subjectColumns.length > 3 && (
                                  <TableCell className="text-right">...</TableCell>
                                )}
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                                Tidak ada data yang valid
                              </TableCell>
                            </TableRow>
                          )}
                          {previewData.length > 50 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground">
                                ...dan {previewData.length - 50} siswa lainnya
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                      <span>Total {previewData.length} siswa dengan nilai dari kelas {selectedClass}</span>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="errors" className="mt-0">
                    <div className="rounded-md border h-60 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Baris</TableHead>
                            <TableHead className="w-[100px]">Kolom</TableHead>
                            <TableHead>Siswa</TableHead>
                            <TableHead>Pesan Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importErrors.length > 0 ? (
                            importErrors.map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.row || '-'}</TableCell>
                                <TableCell>{error.column || '-'}</TableCell>
                                <TableCell>
                                  {error.studentName || error.nisn || '-'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <AlertCircle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
                                    <span className="text-sm">{error.error}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                                Tidak ada error atau peringatan
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {importErrors.length > 0 && (
                      <div className="mt-2 text-sm text-amber-600">
                        <p>
                          Peringatan: Siswa dengan error masih dapat diimport sepanjang data nilai valid.
                          Perbaiki file Excel jika terdapat error yang perlu diperbaiki.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="subjects" className="mt-0">
                    <div className="rounded-md border h-60 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Kode</TableHead>
                            <TableHead>Nama Mata Pelajaran</TableHead>
                            <TableHead className="w-[120px]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subjectColumns.length > 0 ? (
                            subjectColumns.map((subject, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono">{subject.code}</TableCell>
                                <TableCell>{subject.name}</TableCell>
                                <TableCell>
                                  {subject.id ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Terdaftar
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                      Baru
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                Tidak ada mata pelajaran yang terdeteksi
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {subjectColumns.some(s => !s.id) && (
                      <div className="mt-2 text-sm text-amber-600">
                        <p>
                          Beberapa mata pelajaran belum terdaftar dalam sistem dan akan dibuat otomatis.
                          Pastikan nama mata pelajaran sudah benar sebelum melanjutkan.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCloseModal}
            disabled={isUploading}
          >
            Batal
          </Button>
          
          <Button
            onClick={handleImport}
            disabled={previewData.length === 0 || isUploading || importGradesMutation.isPending}
            className="gap-1"
          >
            {importGradesMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            <span>Import Nilai</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClassGradeImportModal;