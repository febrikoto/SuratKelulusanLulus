import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { CertificateData, SubjectGrade } from '@shared/types';
import { formatDate } from '../client/src/lib/utils';

// Fungsi untuk memformat tanggal
function formatDateForCertificate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    console.error('Kesalahan format tanggal:', e);
    // Jika parsing gagal, kembalikan string asli
    return dateString;
  }
}

// Fungsi untuk menghasilkan QR code sebagai buffer
function generateQRCode(data: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    QRCode.toBuffer(data, { 
      errorCorrectionLevel: 'H', 
      type: 'png', 
      width: 150 
    }, (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}

// Fungsi utama untuk membuat PDF
export async function generateCertificatePDF(data: CertificateData, filePath: string): Promise<void> {
  // Proses QR code di luar Promise constructor jika diperlukan
  let qrCodeBuffer: Buffer | null = null;
  
  if (data.useDigitalSignature) {
    try {
      // Buat data untuk QR code (berisi informasi identitas sertifikat)
      const qrData = JSON.stringify({
        nisn: data.nisn,
        nama: data.fullName,
        sekolah: data.schoolName,
        jurusan: data.majorName || "MIPA",
        tanggalLulus: formatDateForCertificate(data.graduationDate),
        tanggalTerbit: formatDateForCertificate(data.issueDate),
        nomorSurat: data.certNumber
      });
      
      // Buat QR code sebelum mulai membuat PDF
      qrCodeBuffer = await generateQRCode(qrData);
    } catch (e) {
      console.error("Error generating QR code before PDF creation:", e);
    }
  }
  
  // Buat dokumen PDF baru dengan ukuran F4
  const doc = new PDFDocument({
    size: [210 * 2.83, 330 * 2.83], // F4 size in points (1mm ≈ 2.83 points)
    margins: {
      top: 20 * 2.83,    // 2cm top margin
      bottom: 20 * 2.83, // 2cm bottom margin
      left: 20 * 2.83,   // 2cm left margin
      right: 20 * 2.83,  // 2cm right margin
    },
    info: {
      Title: `Surat Keterangan Lulus - ${data.fullName}`,
      Author: data.schoolName,
      Subject: 'Surat Keterangan Lulus',
      Keywords: 'SKL, surat keterangan lulus, ijazah',
      CreationDate: new Date(),
    }
  });
  
  return new Promise((resolve, reject) => {
    try {

      // Stream the PDF to the specified file
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Helper function to add centered text
      const addCenteredText = (text: string, y: number, fontSize: number = 12, isBold: boolean = false) => {
        doc.fontSize(fontSize);
        if (isBold) {
          doc.font('Helvetica-Bold');
        } else {
          doc.font('Helvetica');
        }
        const textWidth = doc.widthOfString(text);
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const x = doc.page.margins.left + (pageWidth - textWidth) / 2;
        doc.text(text, x, y);
      };

      // Helper function untuk menggambar tanda plus di sudut (koordinat)
      const drawPlusMark = (x: number, y: number) => {
        doc.save()
          .strokeColor('#888888')
          .lineWidth(0.5)
          .moveTo(x - 4, y)
          .lineTo(x + 4, y)
          .moveTo(x, y - 4)
          .lineTo(x, y + 4)
          .stroke()
          .restore();
      };

      // Gambar tanda plus di empat sudut (koordinat)
      const margin = 20 * 2.83; // 2cm dalam points
      const docWidth = doc.page.width;
      const docHeight = doc.page.height;
      
      // Kiri atas
      drawPlusMark(margin, margin);
      // Kanan atas
      drawPlusMark(docWidth - margin, margin);
      // Kiri bawah
      drawPlusMark(margin, docHeight - margin);
      // Kanan bawah
      drawPlusMark(docWidth - margin, docHeight - margin);

      // Header: logos & school name
      const headerY = 35;
      const headerHeight = 80;
      
      // Logo Kementerian di kiri
      if (data.ministryLogo) {
        try {
          doc.image(data.ministryLogo, doc.page.margins.left, headerY, {
            width: 60
          });
        } catch (e) {
          console.error("Error loading ministry logo:", e);
        }
      }
      
      // Logo Sekolah di kanan
      if (data.schoolLogo) {
        try {
          doc.image(data.schoolLogo, doc.page.width - doc.page.margins.right - 60, headerY, {
            width: 60
          });
        } catch (e) {
          console.error("Error loading school logo:", e);
        }
      }
      
      // Kop surat dengan teks (di tengah antara kedua logo)
      doc.fontSize(11).font('Helvetica-Bold'); // Lebih kecil dari 13
      addCenteredText(`PEMERINTAH PROVINSI ${data.provinceName.toUpperCase()}`, headerY);
      addCenteredText('DINAS PENDIDIKAN', headerY + 14); // Jarak lebih kecil
      addCenteredText(data.schoolName.toUpperCase(), headerY + 28, 12); // Lebih kecil dari 14
      doc.fontSize(9).font('Helvetica'); // Lebih kecil dari 10
      addCenteredText(`Jalan: ${data.schoolAddress}`, headerY + 42); // Jarak lebih kecil
      
      if (data.schoolEmail || data.schoolWebsite) {
        let contactText = '';
        if (data.schoolEmail) contactText += `E-mail: ${data.schoolEmail} `;
        if (data.schoolEmail && data.schoolWebsite) contactText += ' - ';
        if (data.schoolWebsite) contactText += `Website: ${data.schoolWebsite}`;
        addCenteredText(contactText, headerY + 65);
      }

      // Garis pemisah header
      const lineY = headerY + headerHeight;
      doc.moveTo(doc.page.margins.left, lineY)
         .lineTo(doc.page.width - doc.page.margins.right, lineY)
         .lineWidth(2)
         .stroke();

      // Title
      const titleY = lineY + 20; // Lebih kecil dari 30
      addCenteredText('SURAT KETERANGAN', titleY, 14, true); // Lebih kecil dari 16
      addCenteredText(`No. ${data.certNumberPrefix || data.certNumber}`, titleY + 20); // Lebih kecil dari 25

      // Paragraf regulasi/peraturan
      let y = titleY + 45; // Lebih kecil dari 60
      doc.font('Helvetica').fontSize(11); // Lebih kecil dari 12
      
      // Teks regulasi
      const regulationText = data.certRegulationText || 
        "Berdasarkan Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 Tahun 2022 tentang Standar Penilaian Pendidikan pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah.";
      
      // Ukur dan tulis teks regulasi dengan alignment justify
      const textWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      y += doc.heightOfString(regulationText, { width: textWidth, align: 'justify' });
      doc.text(regulationText, doc.page.margins.left, titleY + 45, { // Sesuaikan dengan y baru (45)
        width: textWidth,
        align: 'justify'
      });
      
      y += 20;
      
      // Teks kriteria kelulusan
      if (data.certCriteriaText) {
        // Kriteria dari database - format yang disimpan dari editor
        // Untuk debugging, log konten HTML
        console.log("Original certCriteriaText:", data.certCriteriaText);
        
        // Kita akan berikan logika khusus untuk numbered list
        // Pertama, coba cek jika ini adalah ordered list yang menggunakan CKEditor
        const hasOrderedList = data.certCriteriaText.includes('<ol') || data.certCriteriaText.includes('<oembed');
        const originalText = data.certCriteriaText;
        
        // Kita akan membuat array dari item-item agar bisa diformat
        let criteriaParagraphs = [];
        
        if (hasOrderedList) {
          // Jika ini adalah ordered list
          console.log("Processing as ordered list");
          
          // Extract semua item <li> dari text
          const liRegex = /<li[^>]*>(.*?)<\/li>/g;
          let match;
          let counter = 1;
          
          // Ambil semua konten <li> items dan tambahkan penomoran
          while ((match = liRegex.exec(originalText)) !== null) {
            // match[1] adalah konten di dalam tag <li>
            let itemContent = match[1].trim()
              .replace(/<\/?p>/g, '')
              .replace(/<\/?strong>/g, '')
              .replace(/<\/?em>/g, '')
              .replace(/<br\s*\/?>/g, '');
              
            criteriaParagraphs.push(`${counter}. ${itemContent}`);
            counter++;
          }
          
          // Jika tidak menemukan <li>, coba alternatif parsing
          if (criteriaParagraphs.length === 0) {
            console.log("No <li> tags found, trying alternative parsing");
            criteriaParagraphs = originalText
              .replace(/<ol[^>]*>/g, '')
              .replace(/<\/ol>/g, '')
              .replace(/<\/?p>/g, '')
              .replace(/<\/?strong>/g, '')
              .replace(/<\/?em>/g, '')
              .replace(/<br\s*\/?>/g, '\n')
              .replace(/<oembed[^>]*>/g, '')
              .replace(/<figure[^>]*>.*?<\/figure>/g, '')
              .split('\n')
              .filter(line => line.trim() !== '')
              .map((line, idx) => `${idx + 1}. ${line.trim()}`);
          }
        } else {
          // Jika ini bukan ordered list, proses sebagai unordered list atau teks biasa
          console.log("Processing as unordered list or plain text");
          criteriaParagraphs = originalText
            .replace(/<\/?p>/g, '')
            .replace(/<\/?strong>/g, '')
            .replace(/<\/?em>/g, '')
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<\/?ul>/g, '')
            .replace(/<li>/g, '• ')
            .replace(/<\/li>/g, '\n')
            .split('\n')
            .filter(line => line.trim() !== '');
        }
          
        // Tambahkan judul Kriteria sebelum list
        doc.font('Helvetica').fontSize(11); // Lebih kecil dari 12
        doc.text('Kriteria Lulus dari Satuan Pendidikan sesuai dengan peraturan perundang-undangan.', doc.page.margins.left, y, { 
          width: textWidth, 
          align: 'left'
        });
        y += doc.heightOfString('Kriteria Lulus dari Satuan Pendidikan sesuai dengan peraturan perundang-undangan.', { width: textWidth }) + 10; // Lebih kecil dari 15
        
        for (const paragraph of criteriaParagraphs) {
          doc.text(paragraph.trim(), doc.page.margins.left + 15, y, { // Mengurangi indentasi
            width: textWidth - 15, // Sesuaikan dengan indentasi
            align: 'left'
          });
          y += doc.heightOfString(paragraph.trim(), { width: textWidth - 15 }) + 8; // Mengurangi spasi
        }
      } else {
        // Kriteria default - format sesuai gambar dari user
        doc.font('Helvetica').fontSize(11); // Lebih kecil dari 12
        doc.text('Kriteria Lulus dari Satuan Pendidikan sesuai dengan peraturan perundang-undangan.', doc.page.margins.left, y, { 
          width: textWidth, 
          align: 'left'
        });
        y += doc.heightOfString('Kriteria Lulus dari Satuan Pendidikan sesuai dengan peraturan perundang-undangan.', { width: textWidth }) + 10; // Lebih kecil dari 15
        
        const defaultCriteria = [
          `1. Surat Kepala Dinas Pendidikan Provinsi ${data.provinceName} Nomor : 400.14.4.3/1107/PSMA/DISDIK-2024 tanggal 18 April 2025 tentang Kelulusan SMA/SMK/SLB Tahun Ajaran ${data.academicYear}`,
          `2. Ketuntasan dari seluruh program pembelajaran sesuai kurikulum yang berlaku, termasuk Ekstrakurikuler dan Prestasi lainnya.`
        ];
        
        for (const line of defaultCriteria) {
          doc.text(line, doc.page.margins.left + 15, y, { // Mengurangi indentasi
            width: textWidth - 15, // Sesuaikan dengan indentasi
            align: 'left'
          });
          y += doc.heightOfString(line, { width: textWidth - 15 }) + 8; // Mengurangi spasi
        }
      }
      
      y += 5;
      
      // Teks sebelum data siswa
      const beforeStudentText = data.certBeforeStudentData || "Yang bertanda tangan di bawah ini, Kepala Sekolah Menengah Atas, menerangkan bahwa:";
      y += doc.heightOfString(beforeStudentText, { width: textWidth });
      doc.text(beforeStudentText, doc.page.margins.left, y - doc.heightOfString(beforeStudentText), {
        width: textWidth,
        align: 'justify'
      });
      
      y += 15;

      // Data siswa
      const studentInfo = [
        { label: 'Nama Siswa', value: data.fullName },
        { label: 'Tempat, Tanggal Lahir', value: `${data.birthPlace}, ${formatDateForCertificate(data.birthDate)}` },
        { label: 'NIS / NISN', value: `${data.nis} / ${data.nisn}` },
        { label: 'Jurusan', value: data.majorName || "MIPA" },
        { label: 'Orang Tua / Wali', value: data.parentName }
      ];
      
      const labelWidth = 150;
      const colonWidth = 10;
      doc.fontSize(11); // Ukuran font lebih kecil
      
      for (const info of studentInfo) {
        doc.font('Helvetica').text(info.label, doc.page.margins.left + 15, y); // Mengurangi indentasi
        doc.text(':', doc.page.margins.left + labelWidth + 15, y);
        if (info.label === 'Nama Siswa') {
          doc.font('Helvetica-Bold');
        }
        doc.text(info.value, doc.page.margins.left + labelWidth + 15 + colonWidth, y);
        y += 20; // Mengurangi jarak antar baris
      }
      
      y += 5;
      
      // Teks setelah data siswa
      const afterStudentText = data.certAfterStudentData || "telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan.";
      doc.font('Helvetica').text(afterStudentText, doc.page.margins.left, y, {
        width: textWidth,
        align: 'justify'
      });
      
      y += 30;
      
      // LULUS box
      const boxWidth = 150; // Lebih kecil dari 200
      const boxHeight = 30; // Lebih kecil dari 40
      const boxX = (doc.page.width - boxWidth) / 2;
      doc.rect(boxX, y, boxWidth, boxHeight)
         .lineWidth(1.5) // Sedikit lebih tipis
         .stroke();
      
      doc.font('Helvetica-Bold').fontSize(12); // Lebih kecil dari 16
      addCenteredText('LULUS', y + 8, 12, true);
      
      y += boxHeight + 20;
      
      // Tampilkan nilai jika diperlukan
      if (data.showGrades && data.grades && data.grades.length > 0) {
        // Cek apakah halaman masih cukup untuk menampilkan nilai
        const estimatedGradeHeight = (data.grades.length + 5) * 25; // Perkiraan tinggi tabel
        
        if (y + estimatedGradeHeight > doc.page.height - doc.page.margins.bottom) {
          // Jika tidak cukup, buat halaman baru
          doc.addPage({
            size: [210 * 2.83, 330 * 2.83], // F4 size
            margins: {
              top: 20 * 2.83,    // 2cm top margin
              bottom: 20 * 2.83, // 2cm bottom margin
              left: 20 * 2.83,   // 2cm left margin
              right: 20 * 2.83,  // 2cm right margin
            }
          });
          y = doc.page.margins.top;
        }
        
        doc.font('Helvetica').fontSize(12);
        doc.text('dengan nilai sebagai berikut :', doc.page.margins.left, y);
        
        y += 20;
        
        // Buat tabel nilai
        const tableTop = y;
        const colWidths = [60, 300, 100]; // No, Mata Pelajaran, Nilai
        const rowHeight = 25;
        let currentY = tableTop;
        
        // Fungsi helper untuk membuat sel tabel
        const drawTableCell = (text: string, x: number, y: number, width: number, height: number, isHeader: boolean = false, align: string = 'left') => {
          // Draw border
          doc.rect(x, y, width, height).stroke();
          
          // Draw text
          const textOptions = { width: width - 10, align: align as any };
          if (isHeader) {
            doc.font('Helvetica-Bold');
          } else {
            doc.font('Helvetica');
          }
          
          // Center text vertically
          const textHeight = doc.heightOfString(text, textOptions);
          const textY = y + (height - textHeight) / 2;
          
          doc.text(text, x + 5, textY, textOptions);
        };
        
        // Header row
        let currentX = doc.page.margins.left;
        drawTableCell('No', currentX, currentY, colWidths[0], rowHeight, true, 'left');
        currentX += colWidths[0];
        drawTableCell('Mata Pelajaran', currentX, currentY, colWidths[1], rowHeight, true, 'left');
        currentX += colWidths[1];
        drawTableCell('Nilai', currentX, currentY, colWidths[2], rowHeight, true, 'left');
        currentY += rowHeight;
        
        // Group A: Pelajaran Umum
        currentX = doc.page.margins.left;
        drawTableCell('A', currentX, currentY, colWidths[0], rowHeight, true, 'left');
        currentX += colWidths[0];
        drawTableCell('Pelajaran Umum', currentX, currentY, colWidths[1], rowHeight, true, 'left');
        currentX += colWidths[1];
        drawTableCell('', currentX, currentY, colWidths[2], rowHeight, false, 'left');
        currentY += rowHeight;
        
        // Group A rows (first 6 grades)
        const groupAGrades = data.grades.slice(0, 6);
        for (let i = 0; i < groupAGrades.length; i++) {
          currentX = doc.page.margins.left;
          drawTableCell((i + 1).toString(), currentX, currentY, colWidths[0], rowHeight, false, 'left');
          currentX += colWidths[0];
          drawTableCell(groupAGrades[i].name, currentX, currentY, colWidths[1], rowHeight, false, 'left');
          currentX += colWidths[1];
          drawTableCell(groupAGrades[i].value.toFixed(2), currentX, currentY, colWidths[2], rowHeight, false, 'left');
          currentY += rowHeight;
          
          // Cek apakah perlu halaman baru
          if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage({
              size: [210 * 2.83, 330 * 2.83],
              margins: {
                top: 20 * 2.83,
                bottom: 20 * 2.83,
                left: 20 * 2.83,
                right: 20 * 2.83,
              }
            });
            currentY = doc.page.margins.top;
          }
        }
        
        // Group B: Keterampilan
        currentX = doc.page.margins.left;
        drawTableCell('B', currentX, currentY, colWidths[0], rowHeight, true, 'left');
        currentX += colWidths[0];
        drawTableCell('Keterampilan', currentX, currentY, colWidths[1], rowHeight, true, 'left');
        currentX += colWidths[1];
        drawTableCell('', currentX, currentY, colWidths[2], rowHeight, false, 'left');
        currentY += rowHeight;
        
        // Group B rows (next 3 grades)
        const groupBGrades = data.grades.slice(6, 9);
        for (let i = 0; i < groupBGrades.length; i++) {
          currentX = doc.page.margins.left;
          drawTableCell((i + 7).toString(), currentX, currentY, colWidths[0], rowHeight, false, 'left');
          currentX += colWidths[0];
          drawTableCell(groupBGrades[i].name, currentX, currentY, colWidths[1], rowHeight, false, 'left');
          currentX += colWidths[1];
          drawTableCell(groupBGrades[i].value.toFixed(2), currentX, currentY, colWidths[2], rowHeight, false, 'left');
          currentY += rowHeight;
          
          if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage({
              size: [210 * 2.83, 330 * 2.83],
              margins: {
                top: 20 * 2.83,
                bottom: 20 * 2.83,
                left: 20 * 2.83,
                right: 20 * 2.83,
              }
            });
            currentY = doc.page.margins.top;
          }
        }
        
        // Group C: Peminatan
        currentX = doc.page.margins.left;
        drawTableCell('C', currentX, currentY, colWidths[0], rowHeight, true, 'left');
        currentX += colWidths[0];
        drawTableCell('Peminatan', currentX, currentY, colWidths[1], rowHeight, true, 'left');
        currentX += colWidths[1];
        drawTableCell('', currentX, currentY, colWidths[2], rowHeight, false, 'left');
        currentY += rowHeight;
        
        // Group C rows (next 5 grades)
        const groupCGrades = data.grades.slice(9, 14);
        for (let i = 0; i < groupCGrades.length; i++) {
          currentX = doc.page.margins.left;
          drawTableCell((i + 10).toString(), currentX, currentY, colWidths[0], rowHeight, false, 'left');
          currentX += colWidths[0];
          drawTableCell(groupCGrades[i].name, currentX, currentY, colWidths[1], rowHeight, false, 'left');
          currentX += colWidths[1];
          drawTableCell(groupCGrades[i].value.toFixed(2), currentX, currentY, colWidths[2], rowHeight, false, 'left');
          currentY += rowHeight;
          
          if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage({
              size: [210 * 2.83, 330 * 2.83],
              margins: {
                top: 20 * 2.83,
                bottom: 20 * 2.83,
                left: 20 * 2.83,
                right: 20 * 2.83,
              }
            });
            currentY = doc.page.margins.top;
          }
        }
        
        // Group D: Jika ada
        if (data.grades.length > 14) {
          currentX = doc.page.margins.left;
          drawTableCell('D', currentX, currentY, colWidths[0], rowHeight, true, 'left');
          currentX += colWidths[0];
          drawTableCell('Lintas Minat', currentX, currentY, colWidths[1], rowHeight, true, 'left');
          currentX += colWidths[1];
          drawTableCell('', currentX, currentY, colWidths[2], rowHeight, false, 'left');
          currentY += rowHeight;
          
          // Group D rows (remaining grades)
          const groupDGrades = data.grades.slice(14);
          for (let i = 0; i < groupDGrades.length; i++) {
            currentX = doc.page.margins.left;
            drawTableCell((i + 15).toString(), currentX, currentY, colWidths[0], rowHeight, false, 'left');
            currentX += colWidths[0];
            drawTableCell(groupDGrades[i].name, currentX, currentY, colWidths[1], rowHeight, false, 'left');
            currentX += colWidths[1];
            drawTableCell(groupDGrades[i].value.toFixed(2), currentX, currentY, colWidths[2], rowHeight, false, 'left');
            currentY += rowHeight;
            
            if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom) {
              doc.addPage({
                size: [210 * 2.83, 330 * 2.83],
                margins: {
                  top: 20 * 2.83,
                  bottom: 20 * 2.83,
                  left: 20 * 2.83,
                  right: 20 * 2.83,
                }
              });
              currentY = doc.page.margins.top;
            }
          }
        }
        
        // Average row
        currentX = doc.page.margins.left;
        drawTableCell('RATA RATA', currentX, currentY, colWidths[0] + colWidths[1], rowHeight, true, 'left');
        currentX += colWidths[0] + colWidths[1];
        drawTableCell(data.averageGrade?.toFixed(2) || '0.00', currentX, currentY, colWidths[2], rowHeight, true, 'left');
        currentY += rowHeight + 20;
        
        // Update y untuk teks terakhir
        y = currentY;
      }
      
      // Teks penutup SKL
      doc.font('Helvetica').fontSize(12);
      doc.text('Demikian Surat Keterangan Kelulusan ini diberikan agar dapat dipergunakan sebagaimana mestinya.', 
        doc.page.margins.left, y, { align: 'justify', width: textWidth });
      
      // Jika tidak cukup ruang untuk tanda tangan, buat halaman baru
      if (y + 180 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage({
          size: [210 * 2.83, 330 * 2.83],
          margins: {
            top: 20 * 2.83,
            bottom: 20 * 2.83,
            left: 20 * 2.83,
            right: 20 * 2.83,
          }
        });
        y = doc.page.margins.top;
      } else {
        y += 40;
      }
      
      // Tanda tangan
      const signatureX = doc.page.width - doc.page.margins.right - 200;
      doc.text(`${data.cityName}, ${formatDateForCertificate(data.issueDate)}`, signatureX, y);
      doc.text('Kepala,', signatureX, y + 20);
      
      // Pilih antara tanda tangan digital (TTE) atau tanda tangan biasa + stempel
      if (data.useDigitalSignature && qrCodeBuffer) {
        // Jika TTE diaktifkan, tambahkan QR code di atas nama kepala sekolah
        try {
          // Posisikan QR code tepat di atas nama kepala sekolah dengan ukuran lebih kecil
          const qrX = signatureX;  // Posisi X sama dengan posisi nama kepala sekolah
          const qrY = y + 40;  // Posisi Y sejajar dengan posisi tanda tangan biasa
          doc.image(qrCodeBuffer, qrX, qrY, { width: 80 }); // Ukuran diperkecil menjadi 80
          
          // Tambahkan teks "TTE" di bawah QR
          doc.fontSize(8).font('Helvetica');
          doc.text('TTE', qrX, qrY + 80, { width: 80, align: 'center' });
        } catch (e) {
          console.error("Error adding QR code to PDF:", e);
        }
      } else {
        // Jika TTE tidak diaktifkan, tampilkan tanda tangan biasa dan stempel
        // Tambahkan stempel jika ada
        if (data.schoolStamp) {
          try {
            // Posisikan stempel di tengah tanda tangan, dengan opacity
            doc.opacity(0.8);
            doc.image(data.schoolStamp, signatureX + 20, y + 30, {
              width: 100,
              height: 100
            });
            doc.opacity(1); // Reset opacity
          } catch (e) {
            console.error("Error loading school stamp:", e);
          }
        }
        
        // Tambahkan tanda tangan jika ada
        if (data.headmasterSignature) {
          try {
            // Ukuran tanda tangan diperbesar 2x lipat (dari 80 menjadi 160)
            doc.image(data.headmasterSignature, signatureX + 20, y + 40, {
              width: 160
            });
          } catch (e) {
            console.error("Error loading headmaster signature:", e);
          }
        } else {
          // Jika tidak ada tanda tangan, beri space
          doc.moveDown(4);
        }
      }
      
      // Nama kepala sekolah dengan garis bawah
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`${data.headmasterName}`, signatureX, y + 100);
      doc.fontSize(11).font('Helvetica');
      doc.text(`NIP. ${data.headmasterNip}`, signatureX, y + 120);
      
      // Finalize the PDF
      doc.end();
      
      // When the stream is closed, resolve the promise
      writeStream.on('finish', () => {
        resolve();
      });
      
      writeStream.on('error', (err) => {
        reject(err);
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}