import React, { useRef, useState } from 'react';
import { CertificateData, SubjectGrade } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

// Format tanggal untuk lokal Indonesia
function formatDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  
  return new Date(dateString).toLocaleDateString('id-ID', options);
}

interface CertificateProps {
  data: CertificateData;
  showDownloadButton?: boolean;
  downloadContainerId?: string;
}

export const Certificate: React.FC<CertificateProps> = ({ data, showDownloadButton = false, downloadContainerId }) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  // Set level zoom default lebih kecil untuk mobile
  const [zoomLevel, setZoomLevel] = useState(isMobile ? 0.5 : 0.8);

  const handleDownload = async () => {
    console.log('Certificate component handleDownload not implemented');
    alert('Fitur ini tidak tersedia dalam pop-up. Silakan gunakan tombol unduh di dashboard utama.');
  };

  const handleZoomIn = () => {
    setZoomLevel(prevZoom => Math.min(prevZoom + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel(prevZoom => Math.max(prevZoom - 0.1, 0.3));
  };

  const handleResetZoom = () => {
    setZoomLevel(isMobile ? 0.5 : 0.8);
  };

  // Wrapper style untuk overflow
  const wrapperStyle = {
    maxWidth: '100%',
    overflowX: 'auto' as const,
    overflowY: 'auto' as const,
    maxHeight: isMobile ? '70vh' : '85vh',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: '20px',
  };

  return (
    <div className="flex flex-col items-center">
      {/* Kontrol Zoom */}
      <div className="w-full flex justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleZoomOut} 
            variant="outline"
            size="sm"
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs mx-1">{Math.round(zoomLevel * 100)}%</span>
          <Button 
            onClick={handleZoomIn} 
            variant="outline"
            size="sm"
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleResetZoom} 
            variant="outline"
            size="sm"
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        {showDownloadButton && (
          <Button 
            onClick={handleDownload} 
            className="flex items-center gap-2"
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        )}
      </div>
      
      {/* Wrapper dengan overflow untuk konten yang di-zoom */}
      <div style={wrapperStyle} className="rounded border border-gray-200 dark:border-gray-800">
        <div 
          ref={certificateRef} 
          className="relative p-8 border border-gray-300 bg-white text-black transform-gpu"
          style={{
            width: '210mm',
            minHeight: '297mm',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease-in-out',
            marginBottom: '40px',
          }}
        >
        {/* Header dengan logo dan kop surat */}
        <div className="flex justify-between items-center mb-2">
          <div className="w-20 h-20">
            {data.ministryLogo ? (
              <img src={data.ministryLogo} alt="Logo Kementerian" className="w-full h-full object-contain" />
            ) : (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#f0f0f0" stroke="#333" strokeWidth="1" />
                <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#333">LOGO KEMENTERIAN</text>
              </svg>
            )}
          </div>
          <div className="text-center">
            <p className="font-bold">PEMERINTAH PROVINSI {data.provinceName.toUpperCase()}</p>
            <p className="font-bold">DINAS PENDIDIKAN</p>
            <p className="font-bold text-xl">{data.schoolName.toUpperCase()}</p>
            <p className="text-sm">Jalan: {data.schoolAddress}</p>
            <div className="flex justify-center items-center gap-2 text-sm">
              <p>E-mail: {data.schoolEmail || "sman1duakoto@gmail.com"}</p>
              <p>Website: {data.schoolWebsite || "https://www.sman1duakoto.sch.id"}</p>
            </div>
          </div>
          <div className="w-20 h-20">
            {data.schoolLogo ? (
              <img src={data.schoolLogo} alt="Logo Sekolah" className="w-full h-full object-contain" />
            ) : (
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="48" fill="#f0f0f0" stroke="#333" strokeWidth="1" />
                <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#333">LOGO SEKOLAH</text>
              </svg>
            )}
          </div>
        </div>
      
        <div className="border-b-2 border-black mb-4"></div>
      
        {/* Title */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold">SURAT KETERANGAN</h2>
          <p className="text-base">No. Surat: {data.certNumberPrefix || data.certNumber}</p>
        </div>
      
        {/* Content */}
        <div className="mb-6 text-justify leading-relaxed">
          <p className="mb-4">
            {data.certRegulationText || "Berdasarkan Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 Tahun 2022 tentang Standar Penilaian Pendidikan pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah."}
          </p>
          
          <p className="mb-4">
            {data.certCriteriaText || `Kepala ${data.schoolName} berdasarkan ketentuan yang berlaku mempertimbangan kelulusan peserta didik pada Tahun Pelajaran ${data.academicYear}, diantaranya sebagai berikut:`}
          </p>
          
          <ol className="list-decimal mb-4 pl-8 text-left">
            <li className="mb-1">Kriteria Lulus dari Satuan Pendidikan sesuai dengan peraturan perundang-undangan.</li>
            <li className="mb-1">Surat Kepala Dinas Pendidikan Provinsi {data.provinceName} Nomor : 400.14.4.3/1107/PSMA/DISDIK-2024 tanggal 18
               April 2024 tentang Kelulusan SMA/AMK/SLB Tahun Ajaran {data.academicYear}</li>
            <li className="mb-1">Ketuntasan dari seluruh program pembelajaran sesuai kurikulum yang berlaku, termasuk Ekstrakurikuler dan
               prestasi lainnya</li>
            <li className="mb-1">Hasil Rapat Pleno Dewan Guru pada hari Senin, {formatDate(data.graduationDate)} {data.graduationTime && `Pukul ${data.graduationTime}`}.</li>
          </ol>
          
          <p className="mb-4">{data.certBeforeStudentData || "Yang bertanda tangan di bawah ini, Kepala Sekolah Menengah Atas, menerangkan bahwa:"}</p>
          
          <div className="grid grid-cols-[150px_10px_1fr] gap-y-1 mb-6 ml-4">
            <div>Nama Siswa</div>
            <div>:</div>
            <div className="font-semibold">{data.fullName}</div>
            
            <div>Tempat, Tanggal Lahir</div>
            <div>:</div>
            <div>{data.birthPlace}, {formatDate(data.birthDate)}</div>
            
            <div>NIS / NISN</div>
            <div>:</div>
            <div>{data.nis} / {data.nisn}</div>
            
            <div>Jurusan</div>
            <div>:</div>
            <div>{data.majorName || "MIPA"}</div>
            
            <div>Orang Tua / Wali</div>
            <div>:</div>
            <div>{data.parentName}</div>
          </div>
          
          <p className="mb-4">
            {data.certAfterStudentData || "telah dinyatakan LULUS dari Satuan Pendidikan berdasarkan hasil rapat pleno kelulusan."}
          </p>
          
          <div className="flex justify-center w-full my-6">
            <div className="text-center border-2 border-black px-12 py-2 font-bold text-xl">
              LULUS
            </div>
          </div>
          
          {/* Show grades if enabled */}
          {data.showGrades && data.grades && (
            <>
              <p className="mb-4">dengan hasil sebagai berikut :</p>
              
              <div className="mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-400 px-4 py-2 w-12 text-left">No</th>
                      <th className="border border-gray-400 px-4 py-2 text-left">Mata Pelajaran</th>
                      <th className="border border-gray-400 px-4 py-2 w-24 text-left">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Group A: Pelajaran Umum */}
                    <tr>
                      <td className="border border-gray-400 px-4 py-2 font-bold">A</td>
                      <td className="border border-gray-400 px-4 py-2"></td>
                      <td className="border border-gray-400 px-4 py-2"></td>
                    </tr>
                    {data.grades.slice(0, 6).map((grade, index) => (
                      <tr key={`a-${index}`}>
                        <td className="border border-gray-400 px-4 py-2">{index + 1}</td>
                        <td className="border border-gray-400 px-4 py-2">{grade.name}</td>
                        <td className="border border-gray-400 px-4 py-2">{grade.value.toFixed(2)}</td>
                      </tr>
                    ))}
                    
                    {/* Group B: Keterampilan */}
                    <tr>
                      <td className="border border-gray-400 px-4 py-2 font-bold">B</td>
                      <td className="border border-gray-400 px-4 py-2"></td>
                      <td className="border border-gray-400 px-4 py-2"></td>
                    </tr>
                    {data.grades.slice(6, 9).map((grade, index) => (
                      <tr key={`b-${index}`}>
                        <td className="border border-gray-400 px-4 py-2">{index + 7}</td>
                        <td className="border border-gray-400 px-4 py-2">{grade.name}</td>
                        <td className="border border-gray-400 px-4 py-2">{grade.value.toFixed(2)}</td>
                      </tr>
                    ))}
                    
                    {/* Group C: Peminatan */}
                    <tr>
                      <td className="border border-gray-400 px-4 py-2 font-bold">C</td>
                      <td className="border border-gray-400 px-4 py-2"></td>
                      <td className="border border-gray-400 px-4 py-2"></td>
                    </tr>
                    {data.grades.slice(9).map((grade, index) => (
                      <tr key={`c-${index}`}>
                        <td className="border border-gray-400 px-4 py-2">{index + 10}</td>
                        <td className="border border-gray-400 px-4 py-2">{grade.name}</td>
                        <td className="border border-gray-400 px-4 py-2">{grade.value.toFixed(2)}</td>
                      </tr>
                    ))}
                    
                    {/* Average */}
                    <tr>
                      <td className="border border-gray-400 px-4 py-2 font-bold" colSpan={2}>RATA RATA</td>
                      <td className="border border-gray-400 px-4 py-2 font-bold">{data.averageGrade?.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
          
          <p className="mb-6">
            Demikian Surat Keterangan Kelulusan ini diberikan agar dapat dipergunakan sebagaimana mestinya.
          </p>
        </div>
        
        {/* Signature with Digital Stamp */}
        <div className="grid grid-cols-2 mt-12">
          <div></div>
          <div className="text-center relative">
            <p>{data.cityName}, {formatDate(data.graduationDate)}</p>
            <p>Kepala,</p>
            
            <div className="h-28 flex items-end justify-center relative">
              {data.headmasterSignature ? (
                <img 
                  src={data.headmasterSignature} 
                  alt="Tanda Tangan Kepala Sekolah" 
                  className="h-20 object-contain mb-2 z-10 relative" 
                />
              ) : (
                <p className="font-semibold underline">{data.headmasterName}</p>
              )}
              
              {/* Digital Stamp - Kembali ke posisi awal (di kanan) */}
              <div className="absolute -right-5 bottom-2 w-40 h-40 opacity-60">
                {data.schoolStamp ? (
                  <img src={data.schoolStamp} alt="Stempel Sekolah" className="w-full h-full object-contain" />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="#4444DD" strokeWidth="2" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#4444DD" strokeWidth="1" />
                    <text x="50" y="35" textAnchor="middle" fill="#4444DD" fontSize="6">PEMERINTAH PROVINSI</text>
                    <text x="50" y="45" textAnchor="middle" fill="#4444DD" fontSize="6">{data.provinceName.toUpperCase()}</text>
                    <text x="50" y="55" textAnchor="middle" fill="#4444DD" fontSize="6">{data.schoolName.toUpperCase()}</text>
                    <text x="50" y="65" textAnchor="middle" fill="#4444DD" fontSize="6">{data.cityName.toUpperCase()}</text>
                  </svg>
                )}
              </div>
            </div>
            
            <p className="font-bold">{data.headmasterName}</p>
            <p>NIP. {data.headmasterNip}</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Certificate;