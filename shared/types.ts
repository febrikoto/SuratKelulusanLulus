export interface SubjectGrade {
  name: string;
  value: number;
}

export interface CertificateData {
  id: number;
  nisn: string;
  nis: string;
  fullName: string;
  birthPlace: string;
  birthDate: string;
  parentName: string;
  className: string; // Kelas seperti XII
  certNumber: string;
  certNumberPrefix?: string; // Prefix untuk nomor surat SKL
  certBeforeStudentData?: string; // Teks sebelum data siswa
  certAfterStudentData?: string; // Teks setelah data siswa
  certRegulationText?: string; // Teks peraturan/regulasi kelulusan
  certCriteriaText?: string; // Teks kriteria kelulusan
  issueDate: string;
  graduationDate: string; // Tanggal kelulusan/rapat pleno
  graduationTime?: string; // Waktu kelulusan/rapat pleno
  headmasterName: string;
  headmasterNip: string;
  headmasterSignature?: string; // URL gambar tanda tangan kepala sekolah
  schoolName: string;
  schoolAddress: string;
  schoolEmail?: string; // Email sekolah
  schoolWebsite?: string; // Website sekolah
  schoolLogo?: string; // URL logo sekolah
  schoolStamp?: string; // URL stempel sekolah
  ministryLogo?: string; // URL logo kementerian
  headerImage?: string; // URL gambar KOP surat
  useHeaderImage?: boolean; // Pilihan menggunakan KOP gambar atau teks
  useDigitalSignature?: boolean; // Pilihan menggunakan TTE atau TTD biasa
  cityName: string;
  provinceName: string;
  academicYear: string; // Tahun ajaran
  showGrades?: boolean; // Apakah menampilkan nilai atau tidak
  majorName?: string; // Jurusan (MIPA, IPS, dll)
  grades?: SubjectGrade[]; // Nilai-nilai mata pelajaran
  averageGrade?: number; // Nilai rata-rata
}

export type StudentStatus = 'pending' | 'verified' | 'rejected';

export interface DashboardStats {
  totalStudents: number;
  verifiedStudents: number;
  pendingStudents: number;
  rejectedStudents: number;
  totalClasses: number;
}

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  show: boolean;
  onClose: () => void;
}

export interface UserInfo {
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'guru' | 'siswa';
  studentId?: number;
  assignedMajor?: string; // Jurusan yang diampu oleh guru
  hasSeenWelcome?: boolean;
}
