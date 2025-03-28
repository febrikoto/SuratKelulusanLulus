import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

type LoadingStep = {
  label: string;
  status: 'pending' | 'loading' | 'success' | 'error';
};

interface CertificateLoadingProps {
  steps: LoadingStep[];
  currentStep: number;
  error: string | null;
  onClose: () => void;
  progress: number; // 0-100
}

export const CertificateLoading: React.FC<CertificateLoadingProps> = ({
  steps,
  currentStep,
  error,
  onClose,
  progress
}) => {
  return (
    <div className="p-6 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl">
      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold mb-1">Sedang Menyiapkan Sertifikat</h3>
        <p className="text-sm text-muted-foreground">
          Harap tunggu sebentar sementara sertifikat sedang diproses
        </p>
      </div>

      {/* Certificate icon animation */}
      <div className="mb-8 flex justify-center">
        <div className="relative w-24 h-32">
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FileText size={80} className="text-primary" />
          </motion.div>
          
          {progress < 100 && (
            <motion.div 
              className="absolute inset-0 bg-background"
              initial={{ y: 0 }}
              animate={{ y: `${100 - progress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          )}
          
          {currentStep === steps.length - 1 && !error && progress >= 100 && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <CheckCircle2 size={32} className="text-green-500" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-4 mb-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className="mr-3">
              {step.status === 'pending' && (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
              {step.status === 'loading' && (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              )}
              {step.status === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {step.status === 'error' && (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className={`text-sm ${index === currentStep ? 'font-medium' : 'text-muted-foreground'}`}>
              {step.label}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-500 p-3 bg-red-50 dark:bg-red-900/20 rounded-md mb-4">
          {error}
        </div>
      )}

      {(error || progress === 100) && (
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {error ? 'Coba Lagi' : 'Selesai'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CertificateLoading;