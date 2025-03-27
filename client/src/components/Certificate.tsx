import React from 'react';
import { CertificateData } from '@shared/types';

interface CertificateProps {
  data: CertificateData;
}

export const Certificate: React.FC<CertificateProps> = ({ data }) => {
  return (
    <div 
      id="certificate-container" 
      className="certificate mx-auto max-w-3xl p-8 mb-4"
      style={{
        border: '10px solid #5D5CDE',
        padding: '20px',
        position: 'relative',
        backgroundColor: '#fff',
        color: '#000'
      }}
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-1">SURAT KETERANGAN LULUS</h2>
        <p className="text-lg">Nomor: {data.certNumber}</p>
      </div>
      
      <p className="mb-4">Yang bertanda tangan di bawah ini, Kepala SMA Negeri 1 Contoh, menerangkan bahwa:</p>
      
      <div className="mb-6 space-y-2">
        <div className="grid grid-cols-12">
          <div className="col-span-3">Nama</div>
          <div className="col-span-1">:</div>
          <div className="col-span-8 font-semibold">{data.fullName.toUpperCase()}</div>
        </div>
        
        <div className="grid grid-cols-12">
          <div className="col-span-3">NISN</div>
          <div className="col-span-1">:</div>
          <div className="col-span-8">{data.nisn}</div>
        </div>
        
        <div className="grid grid-cols-12">
          <div className="col-span-3">Tempat, Tgl Lahir</div>
          <div className="col-span-1">:</div>
          <div className="col-span-8">{data.birthPlace}, {data.birthDate}</div>
        </div>
        
        <div className="grid grid-cols-12">
          <div className="col-span-3">Nama Orang Tua</div>
          <div className="col-span-1">:</div>
          <div className="col-span-8">{data.parentName}</div>
        </div>
        
        <div className="grid grid-cols-12">
          <div className="col-span-3">NIS</div>
          <div className="col-span-1">:</div>
          <div className="col-span-8">{data.nis}</div>
        </div>
      </div>
      
      <p className="font-medium mb-4">Berdasarkan hasil rapat pleno kelulusan tanggal 2 Mei 2024, yang bersangkutan dinyatakan:</p>
      
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold py-2 px-8 border-2 border-black inline-block">LULUS</h3>
      </div>
      
      <p className="mb-4">Surat keterangan ini dibuat sebagai pengumuman resmi kelulusan dari SMA Negeri 1 Contoh dan berlaku sampai dengan diterbitkannya ijazah.</p>
      
      <div className="flex justify-end mt-10">
        <div className="text-center">
          <p className="mb-20">Contoh, {data.issueDate}<br/>Kepala Sekolah,</p>
          <p className="font-bold">{data.headmasterName}<br/>NIP. {data.headmasterNip}</p>
        </div>
      </div>
    </div>
  );
};

export default Certificate;
