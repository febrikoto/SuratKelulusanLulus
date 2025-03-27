import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { CertificateData, SubjectGrade } from "@shared/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  
  return new Date(dateString).toLocaleDateString('id-ID', options);
}

export function generateCertificateNumber(studentId: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const paddedId = studentId.toString().padStart(4, '0');
  return `${paddedId}/SKL/SMA.1/${year}`;
}

export function prepareCertificateData(student: any, showGrades: boolean = false): CertificateData {
  // Generate sample grades if needed for demo
  const sampleGrades: SubjectGrade[] = [
    { name: "Bahasa Indonesia", value: 85 },
    { name: "Bahasa Inggris", value: 82 },
    { name: "Matematika", value: 78 },
    { name: "Fisika", value: 80 },
    { name: "Kimia", value: 76 },
    { name: "Biologi", value: 79 },
    { name: "Sejarah", value: 88 },
    { name: "Seni Budaya", value: 90 },
    { name: "Prakarya", value: 85 },
    { name: "Fisika", value: 81 },
    { name: "Kimia", value: 77 },
    { name: "Biologi", value: 83 }
  ];
  
  // Calculate average grade
  const averageGrade = sampleGrades.reduce((sum, grade) => sum + grade.value, 0) / sampleGrades.length;

  return {
    id: student.id,
    nisn: student.nisn,
    nis: student.nis,
    fullName: student.fullName,
    birthPlace: student.birthPlace,
    birthDate: student.birthDate,
    parentName: student.parentName,
    className: student.className,
    certNumber: generateCertificateNumber(student.id),
    issueDate: new Date().toISOString().split('T')[0],
    graduationDate: "4 Mei 2024",
    headmasterName: "Dr. Agus Supriyadi, M.Pd",
    headmasterNip: "19670815 199412 1 001",
    schoolName: "SMA Negeri 1 Dua Koto",
    schoolAddress: "Jl. Raya Padang Panjang KM 5, Dua Koto, Kab. Pasaman, Sumatera Barat",
    cityName: "Pasaman",
    provinceName: "Sumatera Barat",
    academicYear: "2023/2024",
    showGrades: showGrades,
    majorName: "MIPA",
    grades: sampleGrades,
    averageGrade: averageGrade
  };
}

export async function generatePdf(elementId: string, filename: string): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    if (!element) throw new Error('Element not found');
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Promise.reject(error);
  }
}
