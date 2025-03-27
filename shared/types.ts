export interface CertificateData {
  id: number;
  nisn: string;
  nis: string;
  fullName: string;
  birthPlace: string;
  birthDate: string;
  parentName: string;
  className: string;
  certNumber: string;
  issueDate: string;
  headmasterName: string;
  headmasterNip: string;
}

export type StudentStatus = 'pending' | 'verified' | 'rejected';

export interface DashboardStats {
  totalStudents: number;
  verifiedStudents: number;
  pendingStudents: number;
  rejectedStudents: number;
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
}
