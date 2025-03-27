import React from 'react';
import { CertificateData, SubjectGrade } from '@shared/types';
import { formatDate } from '@/lib/utils.tsx';

interface CertificateProps {
  data: CertificateData;
}

export const Certificate: React.FC<CertificateProps> = ({ data }) => {
  return (
    <div id="certificate-container" className="relative p-8 border border-gray-300 bg-white mx-auto w-[210mm] min-h-[297mm] text-black">
      {/* Title */}
      <div className="mb-8 text-center">
        <h2 className="text-xl font-bold">SURAT KETERANGAN</h2>
        <p className="text-base mt-1">No. Surat: {data.certNumber}</p>
      </div>
      
      {/* Content */}
      <div className="mb-6 text-justify leading-relaxed">
        <p className="mb-6">
          Berdasarkan Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 Tahun 2022 tentang
          Standar Penilaian Pendidikan pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan
          Menengah.
        </p>
        
        <p className="mb-6">
          Kepala {data.schoolName} berdasarkan ketentuan yang berlaku mempertimbangan kelulusan peserta didik
          pada Tahun Pelajaran {data.academicYear}, diantaranya sebagai berikut:
        </p>
        
        <ol className="list-decimal list-inside mb-6 pl-4">
          <li className="mb-2">Kriteria Lulus dari Satuan Pendidikan sesuai dengan peraturan perundang-undangan.</li>
          <li className="mb-2">Surat Kepala Dinas Pendidikan Provinsi {data.provinceName} Nomor : 400.14.4.3/1107/PSMA/DISDIK-2024 tanggal 18
             April 2024 tentang Kelulusan SMA/AMK/SLB Tahun Ajaran {data.academicYear}</li>
          <li className="mb-2">Ketuntasan dari seluruh program pembelajaran sesuai kurikulum yang berlaku, termasuk Ekstrakurikuler dan
             prestasi lainnya</li>
        </ol>
        
        <p className="mb-6">Hasil Rapat Pleno Dewan Guru pada hari Senin, {data.graduationDate}.</p>
        
        <p className="mb-4">Mengumumkan bahwa :</p>
        
        <div className="grid grid-cols-[200px_10px_1fr] gap-y-1 mb-6 ml-14">
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
          <div>{data.majorName}</div>
          
          <div>Orang Tua / Wali</div>
          <div>:</div>
          <div>{data.parentName}</div>
        </div>
        
        <p className="mb-6">
          dari {data.schoolName} {data.cityName}, Provinsi {data.provinceName} pada Tahun Ajaran {data.academicYear}, dinyatakan:
        </p>
        
        <div className="text-center font-bold text-2xl my-8">
          LULUS
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
      
      {/* Signature */}
      <div className="grid grid-cols-2 mt-12">
        <div></div>
        <div className="text-center">
          <p>{data.cityName}, {data.graduationDate}</p>
          <p>Kepala {data.schoolName}</p>
          <div className="h-28 flex items-end justify-center">
            <p className="font-semibold underline">{data.headmasterName}</p>
          </div>
          <p>NIP. {data.headmasterNip}</p>
        </div>
      </div>
    </div>
  );
};

export default Certificate;