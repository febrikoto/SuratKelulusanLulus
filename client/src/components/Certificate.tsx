import React from 'react';
import { CertificateData } from '@shared/types';
import { formatDate } from '@/lib/utils.tsx';

interface CertificateProps {
  data: CertificateData;
}

export const Certificate: React.FC<CertificateProps> = ({ data }) => {
  return (
    <div id="certificate-container" className="relative p-8 border border-gray-300 bg-white mx-auto w-[210mm] min-h-[297mm] text-black">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">PEMERINTAH DAERAH PROVINSI JAWA BARAT</h2>
        <h2 className="text-xl font-semibold">DINAS PENDIDIKAN</h2>
        <h1 className="text-2xl font-bold mt-2">SMA NEGERI 1 CONTOH</h1>
        <p className="text-sm">Jl. Pendidikan No. 1 Kota Contoh, Telp. (022) 1234567</p>
        <p className="text-sm">Website: www.sman1contoh.sch.id | Email: info@sman1contoh.sch.id</p>
      </div>
      
      {/* Divider */}
      <div className="border-b-2 border-black mb-6"></div>
      
      {/* Title */}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold">SURAT KETERANGAN LULUS</h2>
        <p className="text-base mt-1">No: {data.certNumber}</p>
      </div>
      
      {/* Content */}
      <div className="mb-6">
        <p className="mb-4">Yang bertanda tangan di bawah ini, Kepala SMA Negeri 1 Contoh, Kota Contoh, Provinsi Jawa Barat menerangkan bahwa:</p>
        
        <div className="grid grid-cols-[150px_10px_1fr] gap-y-2 mb-4">
          <div>Nama Lengkap</div>
          <div>:</div>
          <div className="font-semibold">{data.fullName}</div>
          
          <div>Tempat, Tgl Lahir</div>
          <div>:</div>
          <div>{data.birthPlace}, {formatDate(data.birthDate)}</div>
          
          <div>NISN</div>
          <div>:</div>
          <div>{data.nisn}</div>
          
          <div>NIS</div>
          <div>:</div>
          <div>{data.nis}</div>
          
          <div>Nama Orang Tua</div>
          <div>:</div>
          <div>{data.parentName}</div>
          
          <div>Kelas</div>
          <div>:</div>
          <div>{data.className}</div>
        </div>
        
        <p className="mb-4">Berdasarkan hasil rapat dengan dewan guru pada tanggal {formatDate(data.issueDate)}, dinyatakan <span className="font-bold">LULUS</span> dari SMA Negeri 1 Contoh tahun pelajaran 2023/2024.</p>
        
        <p>Surat keterangan ini berlaku sementara sampai dengan dikeluarkannya Ijazah asli.</p>
      </div>
      
      {/* Signature */}
      <div className="grid grid-cols-2 mt-8">
        <div></div>
        <div className="text-center">
          <p>Contoh, {formatDate(data.issueDate)}</p>
          <p>Kepala SMA Negeri 1 Contoh</p>
          <div className="h-20 flex items-end justify-center">
            <p className="font-semibold underline">{data.headmasterName}</p>
          </div>
          <p>NIP. {data.headmasterNip}</p>
        </div>
      </div>
    </div>
  );
};

export default Certificate;