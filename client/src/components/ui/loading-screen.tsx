import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  minDelay?: number;
}

export function LoadingScreen({ message = 'Memuat...', minDelay = 1000 }: LoadingScreenProps) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!show) {
    return null;
  }
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative"
        >
          <motion.div 
            className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent" 
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "linear"
            }}
          />
          <Loader2 className="h-8 w-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
        </motion.div>
        
        {message && (
          <motion.p 
            className="text-lg font-medium text-center text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            {message}
          </motion.p>
        )}

        <motion.div 
          className="flex space-x-2 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          {[0, 1, 2].map((dot) => (
            <motion.div
              key={dot}
              className="h-2 w-2 rounded-full bg-primary"
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                repeatType: "loop",
                delay: dot * 0.2,
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

LoadingScreen.displayName = "LoadingScreen";