import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { CertificateData } from "@shared/types";

export async function generatePdf(elementId: string, filename: string): Promise<void> {
  try {
    console.log(`Generating PDF for element with ID: ${elementId}`);
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID "${elementId}" not found`);
      throw new Error(`Element with ID "${elementId}" not found`);
    }
    
    // Pendekatan baru yang lebih sederhana - buat gambar saja dulu
    console.log('Menggunakan pendekatan alternatif untuk PDF...');
    
    // Konfigurasi untuk html2canvas
    const options = {
      scale: 1.5, // Lebih kecil untuk menghindari masalah memori
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: true,
      removeContainer: true,
      ignoreElements: (element: Element) => {
        // Ignore any problematic elements
        return element.tagName === 'IFRAME' || element.tagName === 'VIDEO';
      }
    };
    
    try {
      // Coba dengan metode 1
      const canvas = await html2canvas(element, options);
      const imgData = canvas.toDataURL('image/jpeg', 0.8); // JPEG bukan PNG untuk file lebih kecil
      
      // Buat file PDF dengan ukuran A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      // Hitung rasio tinggi-lebar
      const imgWidth = 210; // A4 width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Tambahkan gambar ke PDF
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // Simpan PDF
      pdf.save(`${filename}.pdf`);
      
      console.log('PDF berhasil dibuat');
      
    } catch (canvasError) {
      console.error('Metode 1 gagal, mencoba metode alternatif:', canvasError);
      
      // Jika metode 1 gagal, beritahu pengguna
      alert('Maaf, terjadi masalah saat membuat PDF. Silakan gunakan screenshot untuk menyimpan sertifikat.');
      
      // Tetap berikan image jika memungkinkan
      const dataUrl = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        logging: false
      }).then(canvas => canvas.toDataURL('image/jpeg'));
      
      // Buat link untuk download image sebagai alternatif
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${filename}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error generating PDF (outer):', error);
    alert('Terjadi kesalahan saat mengunduh sertifikat. Silakan coba lagi atau gunakan screenshot.');
    return Promise.reject(error);
  }
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
  const formattedId = String(studentId).padStart(3, '0');
  return `800/128/SMAN1-DK/${year}`;
}

export function prepareCertificateData(student: any, showGrades: boolean = false, settings?: any): CertificateData {
  const today = new Date();
  const grades = showGrades ? [
    { name: "Pendidikan Agama dan Budi Pekerti", value: 87.52 },
    { name: "Pendidikan Pancasila dan Kewarganegaraan", value: 90.40 },
    { name: "Bahasa Indonesia", value: 85.04 },
    { name: "Matematika", value: 87.92 },
    { name: "Sejarah Indonesia", value: 87.52 },
    { name: "Bahasa Inggris", value: 86.04 },
    { name: "Seni Budaya", value: 89.28 },
    { name: "Pendidikan Jasmani, Olah Raga, dan Kesehatan", value: 91.92 },
    { name: "Prakarya dan Kewirausahaan", value: 91.20 },
    { name: "Matematika Peminatan", value: 85.32 },
    { name: "Biologi", value: 88.56 },
    { name: "Fisika", value: 87.64 },
    { name: "Kimia", value: 88.60 },
    { name: "Sosiologi Peminatan", value: 89.04 }
  ] : undefined;
  
  const averageGrade = grades 
    ? Number((grades.reduce((sum, grade) => sum + grade.value, 0) / grades.length).toFixed(2)) 
    : undefined;
  
  return {
    ...student,
    certNumber: generateCertificateNumber(student.id),
    certNumberPrefix: settings?.certNumberPrefix || "",
    certBeforeStudentData: settings?.certBeforeStudentData || "Yang bertanda tangan di bawah ini, Kepala Sekolah Menengah Atas, menerangkan bahwa:",
    certAfterStudentData: settings?.certAfterStudentData || "telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan.",
    issueDate: formatDate(today.toISOString()),
    graduationDate: settings?.graduationDate || "05 Mei 2025",
    graduationTime: settings?.graduationTime || "",
    headmasterName: settings?.headmasterName || "Efriedi, S.Pd, MM",
    headmasterNip: settings?.headmasterNip || "196611011991031005",
    headmasterSignature: settings?.headmasterSignature || "",
    schoolName: settings?.schoolName || "SMA Negeri 1 Dua Koto",
    schoolAddress: settings?.schoolAddress || "Jl. Pendidikan No. 1",
    schoolLogo: settings?.schoolLogo || "",
    schoolStamp: settings?.schoolStamp || "",
    ministryLogo: settings?.ministryLogo || "",
    cityName: settings?.cityName || "KAB. PASAMAN",
    provinceName: settings?.provinceName || "Sumatera Barat",
    academicYear: settings?.academicYear || "2024/2025",
    majorName: "MIPA",
    showGrades,
    grades,
    averageGrade
  };
}

export function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        
        const results = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(value => value.trim());
          const entry: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            entry[header] = values[index] || '';
          });
          
          results.push(entry);
        }
        
        resolve(results);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
}
