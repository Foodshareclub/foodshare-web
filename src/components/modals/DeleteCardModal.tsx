'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProduct } from '@/app/actions/products';
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
 * Uses Server Actions for mutations
 */
const DeleteCardModal: React.FC<PropsType> = ({ isOpen, onClose, product }) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    
    const result = await deleteProduct(product.id);
    
    setIsDeleting(false);
    
    if (result.success) {
      onClose();
      router.refresh();
    } else {
      console.error('Failed to delete product:', result.error);
    }
  };

  return (
    <DeleteConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      itemName={product.post_name}
      itemType="product"
      isLoading={isDeleting}
    />
  );
};

export default DeleteCardModal;
