import React from 'react';
import { ClosedPeriodBlockModal } from './ClosedPeriodBlockModal';
import { AdminAuthModal } from './AdminAuthModal';

interface ClosedPeriodModalsProps {
  showBlockModal: boolean;
  showAuthModal: boolean;
  closedPeriodData: {
    month: number;
    year: number;
    closedBy: string;
    closedAt: string;
  } | null;
  actionDescription: string;
  onCloseBlockModal: () => void;
  onAdminAccess: () => void;
  onCloseAuthModal: () => void;
  onConfirmAuth: (justification: string) => void;
}

export const ClosedPeriodModals: React.FC<ClosedPeriodModalsProps> = ({
  showBlockModal,
  showAuthModal,
  closedPeriodData,
  actionDescription,
  onCloseBlockModal,
  onAdminAccess,
  onCloseAuthModal,
  onConfirmAuth
}) => {
  return (
    <>
      {closedPeriodData && (
        <>
          <ClosedPeriodBlockModal
            isOpen={showBlockModal}
            onClose={onCloseBlockModal}
            onAdminAccess={onAdminAccess}
            periodMonth={closedPeriodData.month}
            periodYear={closedPeriodData.year}
            closedBy={closedPeriodData.closedBy}
            closedAt={closedPeriodData.closedAt}
          />
          
          <AdminAuthModal
            isOpen={showAuthModal}
            onClose={onCloseAuthModal}
            onConfirm={onConfirmAuth}
            periodMonth={closedPeriodData.month}
            periodYear={closedPeriodData.year}
            actionDescription={actionDescription}
          />
        </>
      )}
    </>
  );
};
