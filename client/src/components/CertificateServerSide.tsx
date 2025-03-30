import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { CertificateLoading } from "@/components/CertificateLoading";
import { useToast } from '@/hooks/use-toast';
import { ConfettiCelebration } from "@/components/ConfettiCelebration";

interface CertificateServerSideProps {
  studentId: number;
  showGrades?: boolean;
}

export const CertificateServerSide: React.FC<CertificateServerSideProps> = ({ studentId, showGrades = false }) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();
  
  // Type for loading step status
  type LoadingStepStatus = 'pending' | 'loading' | 'success' | 'error';
  
  // Loading steps state with initial value
  const [loadingSteps, setLoadingSteps] = useState([
    { label: 'Mempersiapkan data sertifikat', status: 'pending' as LoadingStepStatus },
    { label: 'Menghasilkan file PDF', status: 'pending' as LoadingStepStatus },
    { label: 'Mengunduh sertifikat', status: 'pending' as LoadingStepStatus }
  ]);

  // Function to update steps status
  const updateStepStatus = (index: number, status: LoadingStepStatus) => {
    const updatedSteps = [...loadingSteps];
    updatedSteps[index].status = status;
    setLoadingSteps(updatedSteps);
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Step 1: Preparing data
      updateStepStatus(0, 'loading');
      setCurrentStep(0);
      
      // Artificial delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      updateStepStatus(0, 'success');
      
      // Step 2: Generating PDF
      updateStepStatus(1, 'loading');
      setCurrentStep(1);
      
      // Artificial delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      updateStepStatus(1, 'success');
      
      // Step 3: Downloading
      updateStepStatus(2, 'loading');
      setCurrentStep(2);

      // Start the actual download
      const downloadUrl = `/api/certificates/${studentId}?showGrades=${showGrades}`;
      
      // Create a hidden <a> tag and trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', ''); // This is ignored in favor of Content-Disposition header from server
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Wait for another artificial delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateStepStatus(2, 'success');
      
      // Tampilkan konfeti
      setShowConfetti(true);
      
      // Successful toast
      toast({
        title: 'Berhasil!',
        description: `Sertifikat ${showGrades ? 'dengan nilai' : 'tanpa nilai'} telah diunduh.`,
        variant: 'default',
      });
      
    } catch (err) {
      console.error('Error downloading certificate:', err);
      
      // Mark current step as error
      updateStepStatus(currentStep, 'error');
      
      // Set error message
      setError('Terjadi kesalahan saat mengunduh sertifikat. Silakan coba lagi nanti.');
      
      // Error toast
      toast({
        title: 'Gagal mengunduh sertifikat',
        description: 'Terjadi kesalahan saat mengunduh. Silakan coba lagi nanti.',
        variant: 'destructive',
      });
    } finally {
      // After a delay, close the loading modal
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    }
  };

  return (
    <>
      <Button
        className={`${showGrades ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'} w-full`}
        onClick={handleDownload}
        disabled={loading}
      >
        <Download className="mr-2 h-4 w-4" /> Unduh SKL {showGrades ? 'dengan Nilai' : 'tanpa Nilai'}
      </Button>
      
      {loading && (
        <CertificateLoading
          steps={loadingSteps}
          currentStep={currentStep}
          error={error}
          onClose={() => setLoading(false)}
          progress={(currentStep + 1) / loadingSteps.length * 100}
        />
      )}
      
      <ConfettiCelebration 
        show={showConfetti} 
        duration={4000}
        onComplete={() => setShowConfetti(false)}
      />
    </>
  );
};