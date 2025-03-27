import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { UserInfo } from "@shared/types";

interface WelcomeAnimationProps {
  user: UserInfo;
  onClose: () => void;
}

export const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ user, onClose }) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const steps = [
    {
      title: `Selamat Datang, ${user.fullName}!`,
      description: `Selamat datang di Aplikasi SKL (Surat Keterangan Lulus). 
        Kami senang ${user.role === 'admin' ? 'Anda sebagai admin' : 
                     user.role === 'guru' ? 'Anda sebagai guru' : 
                     'Anda sebagai siswa'} 
        bergabung dengan kami.`,
      icon: '🎓'
    },
    {
      title: 'Fitur Utama',
      description: `${user.role === 'admin' ? 
        'Sebagai admin, Anda dapat mengelola siswa, mengatur informasi sekolah, dan mencetak sertifikat kelulusan.' : 
        user.role === 'guru' ? 
        'Sebagai guru, Anda dapat memverifikasi data siswa dan melihat sertifikat kelulusan mereka.' :
        'Sebagai siswa, Anda dapat melihat dan mengunduh sertifikat kelulusan Anda.'}`,
      icon: '📋'
    },
    {
      title: 'Siap Memulai?',
      description: 'Kami harap aplikasi ini dapat membantu Anda dalam pengelolaan sertifikat kelulusan dengan mudah dan efisien.',
      icon: '🚀'
    }
  ];

  useEffect(() => {
    // Auto-proceed to next step after 4 seconds
    const timer = setTimeout(() => {
      if (step < steps.length - 1) {
        setStep(prevStep => prevStep + 1);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [step, steps.length]);

  const handleClose = () => {
    setVisible(false);
    // Add a small delay before executing onClose to allow exit animation
    setTimeout(onClose, 300);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-5xl mb-4"
                >
                  {steps[step].icon}
                </motion.div>
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                  {steps[step].title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  {steps[step].description}
                </p>
                
                <div className="flex items-center justify-between w-full">
                  <div className="flex space-x-2">
                    {steps.map((_, idx) => (
                      <motion.div
                        key={idx}
                        className={`h-2 rounded-full ${idx === step ? 'w-8 bg-primary' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}
                        animate={{ width: idx === step ? 32 : 8 }}
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex space-x-2">
                    {step < steps.length - 1 ? (
                      <>
                        <Button variant="outline" size="sm" onClick={handleClose}>
                          Lewati
                        </Button>
                        <Button size="sm" onClick={() => setStep(prevStep => prevStep + 1)}>
                          Lanjut
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={handleClose}>
                        Mulai
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeAnimation;