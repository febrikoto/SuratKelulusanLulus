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
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID "${elementId}" not found`);
      throw new Error(`Element with ID "${elementId}" not found`);
    }
    
    // Log element properties untuk debugging
    console.log(`Element found: ${element.tagName}, Width: ${element.offsetWidth}, Height: ${element.offsetHeight}`);
    
    // Pendekatan sederhana: tangkap langsung saja
    onProgress && onProgress('Menyiapkan elemen sertifikat', 20);
    
    // Pendekatan baru: Ambil screenshot langsung dari elemen asli
    // dengan opsi yang disederhanakan
    const options = {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FFFFFF', 
      scrollX: 0,
      scrollY: 0,
      windowWidth: undefined,
      windowHeight: undefined
    };
    
    // Progress: Mulai render
    onProgress && onProgress('Membuat gambar sertifikat', 40);
    
    // Langsung render dari elemen asli
    const canvas = await html2canvas(element, options);
    console.log('Canvas created successfully:', canvas.width, 'x', canvas.height);
    
    // Progress: Render canvas selesai
    onProgress && onProgress('Mengoptimasi gambar', 60);
    
    // Jika canvas berhasil dibuat, konversi ke gambar
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    
    // Coba pendekatan paling sederhana dulu: unduh saja sebagai gambar
    if (filename.endsWith('.pdf')) {
      // Progress: Optimasi selesai
      onProgress && onProgress('Membuat file PDF', 70);
      
      // Buat file PDF dengan ukuran A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      // A4 dimensions
      const a4Width = 210;  // width in mm
      const a4Height = 297; // height in mm
      
      // Hitung rasio untuk menyesuaikan gambar
      const imgRatio = canvas.width / canvas.height;
      
      // Sesuaikan dimensi gambar agar fit di halaman PDF (skala penuh)
      let imgWidth = a4Width;
      let imgHeight = imgWidth / imgRatio;
      
      // Jika tinggi lebih dari halaman A4, skala berdasarkan tinggi
      if (imgHeight > a4Height) {
        imgHeight = a4Height;
        imgWidth = imgHeight * imgRatio;
      }
      
      // Progress: Persiapan PDF
      onProgress && onProgress('Memasukkan gambar ke PDF', 80);
      
      // Posisikan gambar di tengah halaman
      const xOffset = (a4Width - imgWidth) / 2;
      const yOffset = (a4Height - imgHeight) / 2;
      
      // Tambahkan gambar ke PDF
      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
      
      // Progress: Siap untuk save
      onProgress && onProgress('Menyimpan file PDF', 90);
      
      // Simpan PDF
      pdf.save(filename);
    } else {
      // Langsung simpan sebagai gambar jika bukan PDF
      const a = document.createElement('a');
      a.href = imgData;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    
    // Progress: Selesai
    onProgress && onProgress('Berhasil membuat sertifikat', 100);
    console.log('Sertifikat berhasil dibuat', filename);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error generating certificate:', error);
    onProgress && onProgress('Terjadi kesalahan saat membuat sertifikat', 100);
    
    // Sebagai fallback langsung ke JPG saja
    try {
      onProgress && onProgress('Mencoba unduh sebagai gambar (JPG)', 50);
      
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Element not found for fallback method');
      }
      
      // Opsi yang lebih sederhana, fokus pada kualitas gambar 
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF'
      });
      
      onProgress && onProgress('Gambar berhasil dibuat, menyiapkan download', 75);
      
      // Konversi ke gambar dengan nama yang sesuai
      const imgData = canvas.toDataURL('image/jpeg', 0.95); // Quality 95%
      
      // Buat link download
      const a = document.createElement('a');
      a.href = imgData;
      a.download = filename.replace('.pdf', '.jpg');
      document.body.appendChild(a);
      
      // Klik link untuk memulai download
      onProgress && onProgress('Menyimpan gambar sertifikat', 90);
      a.click();
      
      // Hapus link setelah download dimulai
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      
      onProgress && onProgress('Berhasil membuat gambar sertifikat', 100);
    } catch (fallbackError) {
      console.error('Fallback method failed:', fallbackError);
      return Promise.reject(error);
    }
    
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

export function prepareCertificateData(student: Record<string, any>, showGrades: boolean = false, settings?: Record<string, any>): CertificateData {
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
