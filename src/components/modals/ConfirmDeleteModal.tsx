import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type ConfirmDeleteModalType = {
  isOpen: boolean;
  onClose: () => void;
  deleteProduct: { id: number; productName: string };
  deleteProductHandler: () => void;
};

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalType> = ({
  isOpen,
  onClose,
  deleteProduct,
  deleteProductHandler,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent variant="glass" className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Delete</DialogTitle>
        </DialogHeader>

        <div className="pb-6">
          You are going to delete the product{" "}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {deleteProduct.productName}
          </span>
          . Are you sure?
        </div>

        <DialogFooter className="justify-between">
          <Button variant="glass-accent" className="mr-3" onClick={deleteProductHandler}>
            Yes
          </Button>

          <Button variant="glass" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
