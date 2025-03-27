import React from 'react';
import VerificationModal from './VerificationModal';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: number;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({ 
  isOpen, 
  onClose, 
  studentId 
}) => {
  return (
    <VerificationModal
      isOpen={isOpen}
      onClose={onClose}
      studentId={studentId}
      mode="reject"
    />
  );
};

export default RejectionModal;
