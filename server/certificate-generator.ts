import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
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

// Fungsi utama untuk membuat PDF
export async function generateCertificatePDF(data: CertificateData, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
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
      const headerY = 40;
      const headerHeight = 100;
      
      // Logo Kementerian di kiri
      if (data.ministryLogo) {
        try {
          doc.image(data.ministryLogo, doc.page.margins.left, headerY, {
            width: 70
          });
        } catch (e) {
          console.error("Error loading ministry logo:", e);
        }
      }
      
      // Logo Sekolah di kanan
      if (data.schoolLogo) {
        try {
          doc.image(data.schoolLogo, doc.page.width - doc.page.margins.right - 70, headerY, {
            width: 70
          });
        } catch (e) {
          console.error("Error loading school logo:", e);
        }
      }
      
      // Kop surat dengan teks (di tengah antara kedua logo)
      doc.fontSize(14).font('Helvetica-Bold');
      addCenteredText(`PEMERINTAH PROVINSI ${data.provinceName.toUpperCase()}`, headerY);
      addCenteredText('DINAS PENDIDIKAN', headerY + 20);
      addCenteredText(data.schoolName.toUpperCase(), headerY + 40, 16);
      doc.fontSize(11).font('Helvetica');
      addCenteredText(`Jalan: ${data.schoolAddress}`, headerY + 65);
      
      if (data.schoolEmail || data.schoolWebsite) {
        let contactText = '';
        if (data.schoolEmail) contactText += `E-mail: ${data.schoolEmail} `;
        if (data.schoolEmail && data.schoolWebsite) contactText += ' - ';
        if (data.schoolWebsite) contactText += `Website: ${data.schoolWebsite}`;
        addCenteredText(contactText, headerY + 85);
      }

      // Garis pemisah header
      const lineY = headerY + headerHeight + 10;
      doc.moveTo(doc.page.margins.left, lineY)
         .lineTo(doc.page.width - doc.page.margins.right, lineY)
         .lineWidth(2)
         .stroke();

      // Title
      const titleY = lineY + 30;
      addCenteredText('SURAT KETERANGAN', titleY, 16, true);
      addCenteredText(`No. ${data.certNumberPrefix || data.certNumber}`, titleY + 25);

      // Paragraf regulasi/peraturan
      let y = titleY + 60;
      doc.font('Helvetica').fontSize(12);
      
      // Teks regulasi
      const regulationText = data.certRegulationText || 
        "Berdasarkan Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 Tahun 2022 tentang Standar Penilaian Pendidikan pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah.";
      
      // Ukur dan tulis teks regulasi dengan alignment justify
      const textWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      y += doc.heightOfString(regulationText, { width: textWidth, align: 'justify' });
      doc.text(regulationText, doc.page.margins.left, titleY + 60, {
        width: textWidth,
        align: 'justify'
      });
      
      y += 20;
      
      // Teks kriteria kelulusan
      if (data.certCriteriaText) {
        // Kriteria dari database
        // Karena kita tidak bisa langsung parse HTML, kita harus membuat parsing teks sederhana
        const criteriaParagraphs = data.certCriteriaText
          .replace(/<\/?p>/g, '')
          .replace(/<\/?strong>/g, '')
          .replace(/<\/?em>/g, '')
          .replace(/<br\s*\/?>/g, '\n')
          .replace(/<\/?ul>/g, '')
          .replace(/<li>/g, '• ')
          .replace(/<\/li>/g, '\n')
          .replace(/<\/?ol>/g, '')
          .split('\n')
          .filter(line => line.trim() !== '');
          
        for (const paragraph of criteriaParagraphs) {
          y += doc.heightOfString(paragraph, { width: textWidth, align: 'justify' });
          doc.text(paragraph.trim(), doc.page.margins.left, y - doc.heightOfString(paragraph), {
            width: textWidth,
            align: 'justify'
          });
          y += 10; // Spacing antar paragraf
        }
      } else {
        // Kriteria default
        const defaultCriteria = [
          `Kepala ${data.schoolName} berdasarkan ketentuan yang berlaku mempertimbangan kelulusan peserta didik pada Tahun Pelajaran ${data.academicYear}, diantaranya sebagai berikut:`,
          '1. Kriteria Lulus dari Satuan Pendidikan sesuai dengan peraturan perundang-undangan.',
          `2. Surat Kepala Dinas Pendidikan Provinsi ${data.provinceName} Nomor : 400.14.4.3/1107/PSMA/DISDIK-2024 tanggal 18 April 2024 tentang Kelulusan SMA/SMK/SLB Tahun Ajaran ${data.academicYear}`,
          '3. Ketuntasan dari seluruh program pembelajaran sesuai kurikulum yang berlaku, termasuk Ekstrakurikuler dan prestasi lainnya',
          `4. Hasil Rapat Pleno Dewan Guru pada hari Senin, ${formatDateForCertificate(data.graduationDate)} ${data.graduationTime ? `Pukul ${data.graduationTime}` : ''}.`
        ];
        
        for (const line of defaultCriteria) {
          y += doc.heightOfString(line, { width: textWidth });
          doc.text(line, doc.page.margins.left, y - doc.heightOfString(line), {
            width: textWidth,
            align: line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.') ? 'left' : 'justify'
          });
          y += 10; // Spacing between lines
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
      
      for (const info of studentInfo) {
        doc.font('Helvetica').text(info.label, doc.page.margins.left + 20, y);
        doc.text(':', doc.page.margins.left + labelWidth + 20, y);
        if (info.label === 'Nama Siswa') {
          doc.font('Helvetica-Bold');
        }
        doc.text(info.value, doc.page.margins.left + labelWidth + 20 + colonWidth, y);
        y += 25;
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
      const boxWidth = 200;
      const boxHeight = 40;
      const boxX = (doc.page.width - boxWidth) / 2;
      doc.rect(boxX, y, boxWidth, boxHeight)
         .lineWidth(2)
         .stroke();
      
      doc.font('Helvetica-Bold').fontSize(16);
      addCenteredText('LULUS', y + 10, 16, true);
      
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
      doc.moveDown(4); // Space for signature
      
      // Tanda tangan dan stamp tidak dapat ditambahkan secara langsung
      // Karena ini perlu gambar asli, kita skip dulu
      
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