import React from 'react';
import { DeleteConfirmationModal } from './ConfirmationModal';

type ConfirmDeleteModalType = {
  isOpen: boolean;
  onClose: () => void;
  deleteProduct: { id: number; productName: string };
  deleteProductHandler: () => void;
};

/**
 * @deprecated Use DeleteConfirmationModal directly from ConfirmationModal.tsx
 */
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalType> = ({
  isOpen,
  onClose,
  deleteProduct,
  deleteProductHandler,
}) => {
  return (
    <DeleteConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={deleteProductHandler}
      itemName={deleteProduct.productName}
      itemType="product"
    />
  );
};
