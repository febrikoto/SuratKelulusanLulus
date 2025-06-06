import React, { useRef } from 'react';
import { CertificateData, SubjectGrade } from '@shared/types';
import { formatDate } from '../lib/utils';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface CertificateProps {
  data: CertificateData;
  showDownloadButton?: boolean;
  downloadContainerId?: string;
}

export const Certificate: React.FC<CertificateProps> = ({ data, showDownloadButton = false, downloadContainerId }) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (data && data.id) {
      const url = `/api/certificates/${data.id}?showGrades=${data.showGrades ? 'true' : 'false'}`;
      window.open(url, '_blank');
    } else {
      alert('Tidak dapat mengunduh sertifikat. Data siswa tidak lengkap.');
    }
  };

  return (
    <div className="flex flex-col items-center">
      {showDownloadButton && (
        <div className="w-full flex justify-end mb-4">
          <Button 
            onClick={handleDownload} 
            className="flex items-center gap-2"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      )}
      
      <div 
        ref={certificateRef} 
        className="relative border border-gray-300 bg-white mx-auto w-[215mm] min-h-[330mm] text-black"
        style={{ 
          padding: '20mm', /* 2cm margin di semua sisi */
          fontFamily: 'Arial, sans-serif',
          fontSize: '12pt',
          lineHeight: '1.5',
          color: '#000',
          position: 'relative',
        }}
      >
        {/* Penanda koordinat di sertifikat - Tanda plus kecil tanpa warna */}
        <div className="coordinate-markers">
          {/* Marker kiri atas */}
          <div className="absolute w-4 h-4 left-1 top-1 z-10" style={{ pointerEvents: 'none' }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 0V8M0 4H8" stroke="#888888" strokeWidth="0.5"/>
            </svg>
          </div>
          
          {/* Marker kanan atas */}
          <div className="absolute w-4 h-4 right-1 top-1 z-10" style={{ pointerEvents: 'none' }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 0V8M0 4H8" stroke="#888888" strokeWidth="0.5"/>
            </svg>
          </div>
          
          {/* Marker kiri bawah */}
          <div className="absolute w-4 h-4 left-1 bottom-1 z-10" style={{ pointerEvents: 'none' }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 0V8M0 4H8" stroke="#888888" strokeWidth="0.5"/>
            </svg>
          </div>
          
          {/* Marker kanan bawah */}
          <div className="absolute w-4 h-4 right-1 bottom-1 z-10" style={{ pointerEvents: 'none' }}>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 0V8M0 4H8" stroke="#888888" strokeWidth="0.5"/>
            </svg>
          </div>
        </div>
        {/* Header dengan logo dan kop surat */}
        {data.useHeaderImage && data.headerImage ? (
          // Jika menggunakan gambar KOP surat
          <div className="w-full mb-2">
            <img src={data.headerImage} alt="Kop Surat" className="w-full object-contain" />
          </div>
        ) : (
          // Jika menggunakan teks KOP surat
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
              <p className="font-bold">CABANG DINAS WILAYAH VI</p>
              <p className="font-bold text-xl">{data.schoolName.toUpperCase()}</p>
              <p className="text-sm">Jalan: {data.schoolAddress}</p>
              <div className="flex justify-center items-center gap-2 text-sm">
                <p>E-mail: {data.schoolEmail || ""}</p>
                <p>Website: {data.schoolWebsite || ""}</p>
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
        )}
      
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
          
          {/* Jika teks kriteria khusus tersedia, gunakan itu */}
          {data.certCriteriaText ? (
            <div 
              className="mb-4 text-left prose prose-ol:pl-5 prose-ol:list-decimal prose-ul:pl-5 prose-ul:list-disc prose-p:my-2 prose-p:text-[12pt] prose-li:text-[12pt]" 
              style={{ 
                fontSize: '12pt',
                lineHeight: '1.5',
                fontFamily: 'Arial, sans-serif',
                maxWidth: '100%', /* Agar lebarnya sama dengan paragraf lainnya */
                textAlign: 'justify', /* Untuk konsistensi dengan teks lainnya */
                color: '#000', /* Hitam solid */
                fontWeight: '400' /* Memastikan ketebalan huruf normal */
              }}
              dangerouslySetInnerHTML={{ __html: data.certCriteriaText }}
            />
          ) : (
            <>
              <p className="mb-4">
                {`Kepala ${data.schoolName} berdasarkan ketentuan yang berlaku mempertimbangan kelulusan peserta didik pada Tahun Pelajaran ${data.academicYear}, diantaranya sebagai berikut:`}
              </p>
              
              <ol className="list-decimal mb-4 pl-8 text-left" style={{ color: '#000', fontFamily: 'Arial, sans-serif' }}>
                <li className="mb-1">Kriteria Lulus dari Satuan Pendidikan sesuai dengan peraturan perundang-undangan.</li>
                <li className="mb-1">Surat Kepala Dinas Pendidikan Provinsi {data.provinceName} Nomor : 400.14.4.3/1107/PSMA/DISDIK-2024 tanggal 18
                  April 2024 tentang Kelulusan SMA/AMK/SLB Tahun Ajaran {data.academicYear}</li>
                <li className="mb-1">Ketuntasan dari seluruh program pembelajaran sesuai kurikulum yang berlaku, termasuk Ekstrakurikuler dan
                  prestasi lainnya</li>
                <li className="mb-1">Hasil Rapat Pleno Dewan Guru pada hari Senin, {formatDate(data.graduationDate)} {data.graduationTime && `Pukul ${data.graduationTime}`}.</li>
              </ol>
            </>
          )}
          
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
                      <td className="border border-gray-400 px-4 py-2 font-bold">Pelajaran Umum</td>
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
                      <td className="border border-gray-400 px-4 py-2 font-bold">Keterampilan</td>
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
                      <td className="border border-gray-400 px-4 py-2 font-bold">Peminatan</td>
                      <td className="border border-gray-400 px-4 py-2"></td>
                    </tr>
                    {data.grades.slice(9, 14).map((grade, index) => (
                      <tr key={`c-${index}`}>
                        <td className="border border-gray-400 px-4 py-2">{index + 10}</td>
                        <td className="border border-gray-400 px-4 py-2">{grade.name}</td>
                        <td className="border border-gray-400 px-4 py-2">{grade.value.toFixed(2)}</td>
                      </tr>
                    ))}
                    
                    {/* Group D: Tambahan */}
                    {data.grades.length > 14 && (
                      <>
                        <tr>
                          <td className="border border-gray-400 px-4 py-2 font-bold">D</td>
                          <td className="border border-gray-400 px-4 py-2 font-bold">Lintas Minat</td>
                          <td className="border border-gray-400 px-4 py-2"></td>
                        </tr>
                        {data.grades.slice(14).map((grade, index) => (
                          <tr key={`d-${index}`}>
                            <td className="border border-gray-400 px-4 py-2">{index + 15}</td>
                            <td className="border border-gray-400 px-4 py-2">{grade.name}</td>
                            <td className="border border-gray-400 px-4 py-2">{grade.value.toFixed(2)}</td>
                          </tr>
                        ))}
                      </>
                    )}
                    
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
                    <text x="50" y="30" textAnchor="middle" fill="#4444DD" fontSize="6">PEMERINTAH PROVINSI</text>
                    <text x="50" y="38" textAnchor="middle" fill="#4444DD" fontSize="6">{data.provinceName.toUpperCase()}</text>
                    <text x="50" y="46" textAnchor="middle" fill="#4444DD" fontSize="6">DINAS PENDIDIKAN</text>
                    <text x="50" y="54" textAnchor="middle" fill="#4444DD" fontSize="6">CABANG DINAS WILAYAH VI</text>
                    <text x="50" y="62" textAnchor="middle" fill="#4444DD" fontSize="6">{data.schoolName.toUpperCase()}</text>
                    <text x="50" y="70" textAnchor="middle" fill="#4444DD" fontSize="6">{data.cityName.toUpperCase()}</text>
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
  );
};

export default Certificate;