'use client';

import React from "react";
import { useDeleteProduct } from "@/hooks";
import type { InitialProductStateType } from "@/types/product.types";
import { GlassDialogContent } from "@/components/Glass";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type PropsType = {
  onClose: () => void;
  isOpen: boolean;
  product: InitialProductStateType;
};

/**
 * DeleteCardModal Component
 * Modal for confirming product deletion
 * Uses React Query instead of Redux for delete mutation
 */
const DeleteCardModal: React.FC<PropsType> = ({ isOpen, onClose, product }) => {
  // React Query mutation (replaces Redux thunk)
  const deleteProduct = useDeleteProduct();

  const deleteProductHandler = async () => {
    await deleteProduct.mutateAsync(product.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <GlassDialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Delete</DialogTitle>
        </DialogHeader>

        <div className="pb-6">
          You are going to delete the product{" "}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {product.post_name}
          </span>
          . Are you sure?
        </div>

        <DialogFooter className="justify-between">
          <Button variant="default" onClick={deleteProductHandler} className="mr-3">
            Yes
          </Button>

          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </GlassDialogContent>
    </Dialog>
  );
};

export default DeleteCardModal;
