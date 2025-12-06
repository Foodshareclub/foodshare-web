'use client';

import React from 'react';
import { useDeleteProduct } from '@/hooks';
import type { InitialProductStateType } from '@/types/product.types';
import { DeleteConfirmationModal } from './ConfirmationModal';

type PropsType = {
  onClose: () => void;
  isOpen: boolean;
  product: InitialProductStateType;
};

/**
 * DeleteCardModal Component
 * Modal for confirming product deletion
 * Uses unified DeleteConfirmationModal
 */
const DeleteCardModal: React.FC<PropsType> = ({ isOpen, onClose, product }) => {
  const deleteProduct = useDeleteProduct();

  const handleDelete = async () => {
    await deleteProduct.mutateAsync(product.id);
    onClose();
  };

  return (
    <DeleteConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      itemName={product.post_name}
      itemType="product"
      isLoading={deleteProduct.isPending}
    />
  );
};

export default DeleteCardModal;
