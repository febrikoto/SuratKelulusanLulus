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
    
    // Check for students in the selected class first
    const classStudents = students.filter(s => s.className === selectedClass);
    if (classStudents.length === 0) {
      toast({
        title: 'Tidak ada siswa di kelas ini',
        description: `Silahkan import data siswa terlebih dahulu untuk kelas ${selectedClass} sebelum mengupload nilai`,
        variant: 'destructive',
      });
      setFileError(`Tidak ada siswa di kelas ${selectedClass}. Silahkan import data siswa terlebih dahulu.`);
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
          
          // Check if the workbook has required sheets
          const sheetNames = workbook.SheetNames;
          const hasMultiSheets = sheetNames.length >= 3;
          const hasSiswaSheet = sheetNames.some(name => name.toLowerCase().includes('siswa'));
          const hasMapelSheet = sheetNames.some(name => name.toLowerCase().includes('mapel'));
          const hasNilaiSheet = sheetNames.some(name => name.toLowerCase().includes('nilai'));
          
          let isMultiSheetFormat = hasMultiSheets && hasSiswaSheet && hasMapelSheet && hasNilaiSheet;
          
          // Process data based on detected format
          if (isMultiSheetFormat) {
            // Process multi-sheet format
            await processMultiSheetFormat(workbook);
          } else {
            // Process single sheet format (original implementation)
            await processSingleSheetFormat(workbook);
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
  
  // Process multi-sheet format (Siswa, Mapel, Nilai)
  const processMultiSheetFormat = async (workbook: XLSX.WorkBook) => {
    try {
      // 1. Find the appropriate sheets
      const siswaSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('siswa')
      ) || '';
      
      const mapelSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('mapel')
      ) || '';
      
      const nilaiSheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('nilai')
      ) || '';
      
      if (!siswaSheetName || !mapelSheetName || !nilaiSheetName) {
        setFileError('Format file multi-sheet tidak lengkap. Dibutuhkan sheet Siswa, Mapel, dan Nilai');
        setIsUploading(false);
        return;
      }
      
      // 2. Parse Mapel (Subject) sheet first
      const mapelWorksheet = workbook.Sheets[mapelSheetName];
      const mapelRows = XLSX.utils.sheet_to_json(mapelWorksheet);
      
      if (mapelRows.length === 0) {
        setFileError('Sheet Mapel tidak memiliki data mata pelajaran');
        setIsUploading(false);
        return;
      }
      
      // Extract subject data
      const subjectCols: SubjectColumn[] = [];
      
      for (const row of mapelRows) {
        const mapelData = row as any;
        
        // Skip rows without essential data
        if (!mapelData['Kode Mapel'] || !mapelData['Nama Mapel']) {
          continue;
        }
        
        const code = String(mapelData['Kode Mapel']).trim();
        const name = String(mapelData['Nama Mapel']).trim();
        const group = mapelData['Kelompok Mapel'] ? String(mapelData['Kelompok Mapel']).trim() : 'A';
        const major = mapelData['Jurusan'] ? String(mapelData['Jurusan']).trim() : null;
        
        // Skip if already in the list
        if (subjectCols.some(s => s.code === code)) {
          continue;
        }
        
        // Find if subject already exists in the database
        const existingSubject = subjects.find(s => s.code === code);
        
        if (existingSubject) {
          subjectCols.push({
            code,
            name,
            id: existingSubject.id
          });
        } else {
          // New subject to be created
          subjectCols.push({
            code,
            name
          });
        }
      }
      
      if (subjectCols.length === 0) {
        setFileError('Tidak ada mata pelajaran valid yang ditemukan di sheet Mapel');
        setIsUploading(false);
        return;
      }
      
      setSubjectColumns(subjectCols);
      
      // 3. Process Nilai sheet to extract grades
      const nilaiWorksheet = workbook.Sheets[nilaiSheetName];
      const nilaiRows = XLSX.utils.sheet_to_json(nilaiWorksheet);
      
      if (nilaiRows.length === 0) {
        setFileError('Sheet Nilai tidak memiliki data nilai siswa');
        setIsUploading(false);
        return;
      }
      
      // Parse nilai data
      const grades: GradeData[] = [];
      const errors: ImportError[] = [];
      
      // Get students from the selected class
      const classStudents = students.filter(s => s.className === selectedClass);
      
      for (let i = 0; i < nilaiRows.length; i++) {
        const rowData = nilaiRows[i] as any;
        const rowNum = i + 2; // Excel row number (2-based, accounting for header)
        
        // Skip rows without student identifiers
        if (!rowData['NIS'] && !rowData['NISN'] && !rowData['NAMA SISWA']) {
          continue;
        }
        
        const gradeData: GradeData = {
          studentId: 0,
          nisn: rowData['NISN'] ? String(rowData['NISN']).trim() : '',
          nis: rowData['NIS'] ? String(rowData['NIS']).trim() : '',
          fullName: rowData['NAMA SISWA'] ? String(rowData['NAMA SISWA']).trim() : ''
        };
        
        // Find matching student
        let matchedStudent: Student | undefined;
        
        if (gradeData.nis) {
          matchedStudent = classStudents.find(s => s.nis === gradeData.nis);
        }
        
        if (!matchedStudent && gradeData.nisn) {
          matchedStudent = classStudents.find(s => s.nisn === gradeData.nisn);
        }
        
        if (!matchedStudent && gradeData.fullName) {
          matchedStudent = classStudents.find(s => 
            s.fullName.toLowerCase() === gradeData.fullName.toLowerCase()
          );
        }
        
        if (!matchedStudent) {
          errors.push({
            row: rowNum,
            column: 'NIS/NISN/NAMA SISWA',
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
        
        // Process subject grades
        let hasGrades = false;
        
        for (const subject of subjectCols) {
          const code = subject.code;
          
          if (rowData[code] !== undefined && rowData[code] !== '') {
            const value = Number(rowData[code]);
            
            if (isNaN(value) || value < 0 || value > 100) {
              errors.push({
                row: rowNum,
                column: code,
                studentName: gradeData.fullName,
                nisn: gradeData.nisn,
                error: `Nilai ${code} harus berupa angka 0-100, ditemukan: ${rowData[code]}`
              });
            } else {
              gradeData[code] = value;
              hasGrades = true;
            }
          }
        }
        
        if (!hasGrades) {
          errors.push({
            row: rowNum,
            column: 'Semua mata pelajaran',
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
          description: `Data nilai siap di-import untuk ${grades.length} siswa kelas ${selectedClass} dengan ${subjectCols.length} mata pelajaran.`,
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
      console.error('Error processing multi-sheet Excel:', error);
      setFileError('Gagal memproses file multi-sheet. Pastikan format sesuai');
      setIsUploading(false);
    }
  };
  
  // Process original single-sheet format
  const processSingleSheetFormat = async (workbook: XLSX.WorkBook) => {
    try {
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
      console.error('Error processing single-sheet Excel:', error);
      setFileError('Gagal memproses file. Pastikan format sesuai');
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
          title: 'Tidak ada siswa di kelas ini',
          description: `Silahkan import data siswa terlebih dahulu untuk kelas ${selectedClass} sebelum membuat template nilai`,
          variant: 'destructive',
        });
        return;
      }
      
      // Create empty workbook
      const wb = XLSX.utils.book_new();
      
      // 1. Create SISWA Worksheet
      const siswaHeaders = ['NO', 'NIS', 'NISN', 'NAMA', 'JENGKEL', 'TEMPAT', 'TANGGAL LAHIR', 'USERNAME', 'PASSWORD', 'KELAS', 'JURUSAN', 'KETERANGAN/NIP', 'TAHUN LULUS', 'NAMA WALI', 'Keterangan'];
      const siswaData = [siswaHeaders];
      
      classStudents.forEach((student, index) => {
        const studentRow = [
          index + 1,
          student.nis,
          student.nisn,
          student.fullName,
          'L', // Default jenis kelamin
          student.birthPlace || '',
          student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
          '',  // Username
          '',  // Password
          student.className,
          '',
          student.status || 'LULUS',
          new Date().getFullYear().toString(),
          student.parentName || '',
          ''   // Keterangan tambahan
        ];
        
        siswaData.push(studentRow);
      });
      
      const siswaWs = XLSX.utils.aoa_to_sheet(siswaData);
      XLSX.utils.book_append_sheet(wb, siswaWs, "Siswa");
      
      // 2. Create MAPEL Worksheet
      const mapelHeaders = ['No Urut', 'Kode Mapel', 'Nama Mapel', 'Kelompok Mapel', 'Jurusan', 'STATUS', 'No Urut', 'Keterangan'];
      const mapelData = [mapelHeaders];
      
      subjects.forEach((subject, index) => {
        const mapelRow = [
          index + 1,
          subject.code,
          subject.name,
          subject.group || 'A',
          subject.major || 'semua',
          'aktif',
          index + 1,
          ''  // Keterangan
        ];
        
        mapelData.push(mapelRow);
      });
      
      const mapelWs = XLSX.utils.aoa_to_sheet(mapelData);
      XLSX.utils.book_append_sheet(wb, mapelWs, "Mapel");
      
      // 3. Create NILAI Worksheet
      // Buat header persis seperti contoh yang diberikan
      const nilaiInfo = [
        ['DATA NILAI SISWA', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['SEMESTER', '0', '<< ISI SEMESTER DISINI (1/2/3/4/5/6), UNTUK KEPERLUAN SKL SAJA BISA DIISI 0 SAJA'],
        ['TAHUN LULUS', new Date().getFullYear().toString(), '<< ISI TAHUN LULUS DISINI']
      ];
      
      // Buat header yang lebih sederhana seperti di contoh
      const nilaiHeaders = ['No', 'NIS', 'NAMA SISWA', 'KELAS'];
      
      // Gunakan singkatan mata pelajaran seperti BINDO|MTK|PKN sesuai dengan contoh
      subjects.forEach(subject => {
        // Ubah kode mapel menjadi kode singkat yang lebih umum dikenal
        let shortCode;
        
        // Logic untuk mendapatkan kode singkat yang umum digunakan
        if (subject.code.includes('BIN') || subject.code.includes('IND') || subject.name.includes('Indonesia')) {
          shortCode = 'BINDO';
        } else if (subject.code.includes('MAT') || subject.code.includes('MTK') || subject.name.includes('Matematik')) {
          shortCode = 'MTK';
        } else if (subject.code.includes('PKN') || subject.name.includes('Pancasila') || subject.name.includes('Kewarga')) {
          shortCode = 'PKN';
        } else if (subject.code.includes('BIG') || subject.code.includes('ENG') || subject.name.includes('Inggris')) {
          shortCode = 'BING';
        } else if (subject.code.includes('FIS') || subject.name.includes('Fisika')) {
          shortCode = 'FISIKA';
        } else if (subject.code.includes('KIM') || subject.name.includes('Kimia')) {
          shortCode = 'KIMIA';
        } else if (subject.code.includes('BIO') || subject.name.includes('Biologi')) {
          shortCode = 'BIOLOGI';
        } else if (subject.code.includes('SEJ') || subject.name.includes('Sejarah')) {
          shortCode = 'SEJARAH';
        } else if (subject.code.includes('GEO') || subject.name.includes('Geografi')) {
          shortCode = 'GEOGRAFI';
        } else if (subject.code.includes('EKO') || subject.name.includes('Ekonomi')) {
          shortCode = 'EKONOMI';
        } else if (subject.code.includes('SOS') || subject.name.includes('Sosiologi')) {
          shortCode = 'SOSIOLOGI';
        } else if (subject.code.includes('SEN') || subject.name.includes('Seni')) {
          shortCode = 'SENBUD';
        } else if (subject.code.includes('ORK') || subject.code.includes('PJK') || subject.name.includes('Olahraga') || subject.name.includes('Jasmani')) {
          shortCode = 'PJOK';
        } else if (subject.code.includes('AGM') || subject.code.includes('PAI') || subject.name.includes('Agama')) {
          shortCode = 'AGAMA';
        } else {
          // Jika tidak ada pola yang cocok, gunakan kode yang sudah ada
          shortCode = subject.code.replace(/\s+/g, '');
        }
        
        // Pastikan kodenya unik dengan menambahkan nomor di belakang jika ada duplikat
        nilaiHeaders.push(shortCode);
      });
      
      // Add note
      nilaiHeaders.push('HAPUS KOLOM KODE MAPEL JIKA TIDAK ADA DI SEMESTER INI');
      
      nilaiInfo.push(nilaiHeaders);
      
      // Add student rows
      classStudents.forEach((student, index) => {
        const row = [
          index + 1,
          student.nis,
          student.fullName,
          student.className
        ];
        
        // Add value cells for each subject (default to realistic values like 65, 79, 89)
        subjects.forEach((_, index) => {
          // Rotasi nilai default realistis (65, 79, 89)
          const defaultValues = [65, 79, 89];
          row.push(defaultValues[index % 3]);
        });
        
        nilaiInfo.push(row);
      });
      
      const nilaiWs = XLSX.utils.aoa_to_sheet(nilaiInfo);
      
      // Set column widths for better readability
      const wscols = [
        { wch: 5 },   // No
        { wch: 12 },  // NIS
        { wch: 25 },  // Nama
        { wch: 10 }   // Kelas
      ];
      
      // Gunakan lebar kolom yang lebih sempit untuk nilai pelajaran
      subjects.forEach(() => {
        wscols.push({ wch: 8 });
      });
      
      nilaiWs['!cols'] = wscols;
      
      // Coba tambahkan styling pada header (baris kuning)
      // Ini untuk XLSX.js versi baru, mungkin perlu pendekatan yang berbeda
      const headerStyle = {
        fill: { fgColor: { rgb: "FFFF00" } }, // Yellow background
        font: { bold: true }
      };
      
      // Coba terapkan styling dengan memberi warna pada header
      // CATATAN: Kita perlu menentukan range sel untuk styling
      const headerRange = XLSX.utils.decode_range(nilaiWs['!ref'] || "A1:Z1");
      const headerAddress = { s: {r: 3, c: 0}, e: {r: 3, c: headerRange.e.c} };
      
      // Tambahkan properti !fills jika belum ada
      if (!nilaiWs['!fills']) nilaiWs['!fills'] = [];
      nilaiWs['!fills'].push({ fgColor: { rgb: "FFFF00" } });
      
      XLSX.utils.book_append_sheet(wb, nilaiWs, "Nilai");
      
      // 4. Add instruction sheet
      const instructionData = [
        ['PETUNJUK PENGGUNAAN TEMPLATE'],
        [''],
        ['Petunjuk Umum:'],
        ['1. File Excel ini memiliki 3 sheet: Siswa, Mapel, dan Nilai'],
        ['2. Isi data nilai pada sheet Nilai sesuai dengan kode mata pelajaran'],
        ['3. Nilai harus berupa angka 0-100'],
        ['4. Jangan mengubah format kode mata pelajaran yang sudah ada'],
        ['5. Pastikan data siswa pada sheet Nilai sesuai dengan data di sistem'],
        [''],
        ['Petunjuk Sheet Siswa:'],
        ['- Berisi data lengkap siswa yang akan diimport'],
        ['- Data pada sheet ini tidak perlu diubah, hanya sebagai referensi'],
        [''],
        ['Petunjuk Sheet Mapel:'],
        ['- Berisi daftar mata pelajaran dengan kode, nama, dan kelompok'],
        ['- Kode Mapel tidak boleh menggunakan spasi'],
        ['- Kelompok Mapel cukup pilih A/B/C'],
        ['- Jurusan harus sama seperti jurusan di data siswa'],
        [''],
        ['Petunjuk Sheet Nilai:'],
        ['- Digunakan untuk mengisi nilai siswa'],
        ['- Pastikan Kode Mapel sesuai dengan yang ada di sheet Mapel'],
        ['- Nilai berupa angka 0-100'],
        ['- Kolom yang kosong tidak akan diimport'],
        ['- Semester diisi dengan angka 1-6 (untuk SKL bisa diisi 0)'],
        ['- Tahun lulus diisi dengan tahun kelulusan siswa'],
        [''],
        ['Format yang diimport:'],
        ['1. NIS/NISN siswa akan digunakan untuk mencocokkan data'],
        ['2. Kode mata pelajaran akan digunakan untuk menyimpan nilai'],
        ['3. Sistem akan otomatis membuat mata pelajaran baru jika belum ada'],
        [''],
        [`Kelas yang dipilih: ${selectedClass}`],
        [`Jumlah siswa: ${classStudents.length}`],
        [`Jumlah mata pelajaran: ${subjects.length}`],
      ];
      
      const instructionWs = XLSX.utils.aoa_to_sheet(instructionData);
      XLSX.utils.book_append_sheet(wb, instructionWs, "Petunjuk");
      
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
        title: `Template Nilai Kelas ${selectedClass} berhasil dibuat`,
        description: `Template Excel berisi data ${classStudents.length} siswa dan ${subjects.length} mata pelajaran. Silahkan isi nilai pada kolom mata pelajaran.`,
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
                <p className="text-xs">1. Baris pertama berisi nama kolom (No, NIS, NISN, Nama Siswa, dan kolom mata pelajaran)</p>
                <p className="text-xs">2. Setiap baris berikutnya berisi data siswa dan nilai mata pelajaran</p>
                <p className="text-xs">3. Nilai dalam bentuk angka (0-100)</p>
                <p className="text-xs">4. Template akan menampilkan semua mata pelajaran secara horizontal untuk memudahkan pengisian</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
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
              <p className="text-xs text-muted-foreground mt-1">Kelas yang tersedia: {classList.join(', ')}</p>
            </div>
            
            <div>
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