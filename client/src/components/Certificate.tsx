import React from 'react';
import { CertificateData } from '@shared/types';
import { formatDate } from '@/lib/utils.tsx';

interface CertificateProps {
  data: CertificateData;
}

export const Certificate: React.FC<CertificateProps> = ({ data }) => {
  return (
    <div id="certificate-container" className="certificate relative w-[210mm] min-h-[297mm] mx-auto">
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-1">SURAT KETERANGAN LULUS</h2>
        <p className="text-lg">Nomor: {data.certNumber}</p>
      </div>
      
      {/* Content */}
      <p className="mb-4">
        Yang bertanda tangan di bawah ini, Kepala SMAN 1 Indonesia menerangkan bahwa:
      </p>
      
      <div className="mb-4">
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-1 w-1/3">Nama</td>
              <td className="py-1 w-1/12">:</td>
              <td className="py-1 font-semibold">{data.fullName}</td>
            </tr>
            <tr>
              <td className="py-1">NISN</td>
              <td className="py-1">:</td>
              <td className="py-1 font-semibold">{data.nisn}</td>
            </tr>
            <tr>
              <td className="py-1">NIS</td>
              <td className="py-1">:</td>
              <td className="py-1 font-semibold">{data.nis}</td>
            </tr>
            <tr>
              <td className="py-1">Tempat, Tanggal Lahir</td>
              <td className="py-1">:</td>
              <td className="py-1 font-semibold">{data.birthPlace}, {formatDate(data.birthDate)}</td>
            </tr>
            <tr>
              <td className="py-1">Nama Orang Tua</td>
              <td className="py-1">:</td>
              <td className="py-1 font-semibold">{data.parentName}</td>
            </tr>
            <tr>
              <td className="py-1">Kelas</td>
              <td className="py-1">:</td>
              <td className="py-1 font-semibold">{data.className}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <p className="mb-4 font-semibold text-center">
        Dinyatakan LULUS dari SMAN 1 Indonesia Tahun Pelajaran 2023/2024
      </p>
      
      <p className="mb-8">
        Surat Keterangan ini berlaku sampai dengan diterbitkannya Ijazah yang asli.
      </p>
      
      {/* Signature */}
      <div className="grid grid-cols-2 mt-8">
        <div></div>
        <div className="text-center">
          <p>Indonesia, {formatDate(data.issueDate)}</p>
          <p>Kepala SMAN 1 Indonesia</p>
          <div className="h-24 flex items-end justify-center">
            <p className="font-semibold underline">{data.headmasterName}</p>
          </div>
          <p>NIP. {data.headmasterNip}</p>
        </div>
      </div>
    </div>
  );
};

export default Certificate;