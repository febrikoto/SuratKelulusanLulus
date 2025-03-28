import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { CertificateData } from "@shared/types";

// Definisikan tipe untuk callback progress
export type ProgressCallback = (step: string, progress: number) => void;

export async function generatePdf(
  elementId: string, 
  filename: string, 
  onProgress?: ((step: string, progress: number) => void) | undefined
): Promise<void> {
  try {
    // Report initial progress
    onProgress && onProgress('Memulai proses', 5);
    
    console.log(`Generating PDF for element with ID: ${elementId}`);
    
    // Berikan waktu untuk update DOM dan penemuan elemen
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID "${elementId}" not found`);
      throw new Error(`Element with ID "${elementId}" not found`);
    }
    
    // Log element properties untuk debugging
    console.log(`Element found: ${element.tagName}, Width: ${element.offsetWidth}, Height: ${element.offsetHeight}`);
    console.log(`Visibility: ${window.getComputedStyle(element).visibility}, Display: ${window.getComputedStyle(element).display}`);
    
    // Make element visible for rendering
    const parentElement = element.parentElement;
    if (parentElement) {
      parentElement.style.display = 'block';
      parentElement.style.visibility = 'visible';
      parentElement.style.opacity = '1';
      parentElement.style.position = 'fixed';
      parentElement.style.top = '-9999px';
      parentElement.style.left = '-9999px';
      parentElement.style.width = '210mm';
      parentElement.style.height = 'auto';
      parentElement.style.zIndex = '-1000';
    }
    
    // Progress: Element ditemukan
    onProgress && onProgress('Menyiapkan elemen sertifikat', 15);
    
    // Berikan waktu untuk update styling
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Buat opsi html2canvas yang lebih sederhana
    const options = {
      scale: 2, // Tingkatkan kualitas dengan scale 2
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF',
      logging: true,
      width: 794, // A4 width in px at 96 DPI
      height: 1123, // A4 height in px at 96 DPI
      windowWidth: 794,
      windowHeight: 1123,
      ignoreElements: (element: Element) => {
        return element.tagName === 'IFRAME' || element.tagName === 'VIDEO';
      }
    };
    
    try {
      // Progress: Mulai render
      onProgress && onProgress('Membuat gambar sertifikat', 40);
      
      const canvas = await html2canvas(element, options);
      console.log('Canvas created successfully:', canvas.width, 'x', canvas.height);
      
      // Progress: Render canvas selesai
      onProgress && onProgress('Mengoptimasi gambar', 60);
      
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      
      // Progress: Optimasi selesai
      onProgress && onProgress('Membuat file PDF', 70);
      
      // Buat file PDF dengan ukuran A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        hotfixes: ['px_scaling']
      });
      
      // A4 dimensions
      const a4Width = 210;  // width in mm
      const a4Height = 297; // height in mm
      
      // Sesuaikan ukuran gambar agar cocok dengan halaman A4 penuh
      const imgWidth = a4Width;
      // Hitung tinggi proporsional dan pastikan selalu mengisi halaman A4 penuh
      const imgHeight = a4Height;
      
      // Progress: Persiapan PDF
      onProgress && onProgress('Memasukkan gambar ke PDF', 80);
      
      // Tambahkan gambar ke PDF
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // Progress: Siap untuk save
      onProgress && onProgress('Menyimpan file PDF', 90);
      
      // Simpan PDF dengan nama file yang benar
      pdf.save(filename);
      
      // Progress: Selesai
      onProgress && onProgress('Berhasil membuat sertifikat', 100);
      console.log('PDF berhasil dibuat');
      
    } catch (canvasError) {
      console.error('Metode utama gagal, mencoba metode alternatif:', canvasError);
      
      // Progress: Error terjadi, mencoba alternatif
      onProgress && onProgress('Terjadi kesalahan, mencoba metode alternatif', 50);
      
      try {
        // Coba dengan pengaturan yang lebih sederhana
        onProgress && onProgress('Mencoba metode alternatif dengan pengaturan berbeda', 60);
        
        // Opsi yang lebih sederhana
        const simpleOptions = {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#FFFFFF',
          width: 794,  // A4 width in px at 96 DPI
          height: 1123  // A4 height in px at 96 DPI
        };
        
        const altCanvas = await html2canvas(element, simpleOptions);
        console.log('Alt canvas created successfully:', altCanvas.width, 'x', altCanvas.height);
        const altImgData = altCanvas.toDataURL('image/jpeg', 0.95);
        
        // Progress: Alternatif berhasil
        onProgress && onProgress('Membuat file JPG sebagai alternatif', 80);
        
        // Buat link untuk download image sebagai alternatif
        const a = document.createElement('a');
        a.href = altImgData;
        a.download = filename.replace('.pdf', '.jpg');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Progress: Selesai dengan alternatif
        onProgress && onProgress('Berhasil membuat gambar sertifikat sebagai alternatif', 100);
      } catch (altError) {
        console.error('Semua metode gagal:', altError);
        throw altError;
      }
    } finally {
      // Restore parent element properties
      if (parentElement) {
        parentElement.style.display = '';
        parentElement.style.visibility = '';
        parentElement.style.opacity = '';
        parentElement.style.position = '';
        parentElement.style.top = '';
        parentElement.style.left = '';
        parentElement.style.width = '';
        parentElement.style.height = '';
        parentElement.style.zIndex = '';
      }
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error generating PDF:', error);
    onProgress && onProgress('Terjadi kesalahan saat membuat sertifikat', 100);
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
  // Hanya menggunakan nomor urut siswa yang diformat
  const formattedId = String(studentId).padStart(3, '0');
  return formattedId;
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
    certRegulationText: settings?.certRegulationText || "",
    certCriteriaText: settings?.certCriteriaText || "",
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
