import { useState, useEffect } from "react";
import ReactConfetti from "react-confetti";

interface ConfettiCelebrationProps {
  show: boolean;
  duration?: number; // Duration in milliseconds
  onComplete?: () => void;
}

export function ConfettiCelebration({
  show,
  duration = 3000, // Default to 3 seconds
  onComplete
}: ConfettiCelebrationProps) {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    // Handler untuk resize window
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (show) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
        if (onComplete) onComplete();
      }, duration);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [show, duration, onComplete]);

  if (!showConfetti) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <ReactConfetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={500}
        gravity={0.1}
      />
    </div>
  );
}