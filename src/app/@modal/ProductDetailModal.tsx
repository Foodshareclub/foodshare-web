"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PostDetailContent } from "../food/[id]/PostDetailContent";
import type { InitialProductStateType } from "@/types/product.types";
import type { AuthUser } from "@/lib/data/auth";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ProductDetailModalProps {
  post: InitialProductStateType;
  user: AuthUser | null;
  isAdmin?: boolean;
}

export function ProductDetailModal({ post, user, isAdmin = false }: ProductDetailModalProps) {
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.back();
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-2xl">
        <DialogHeader className="p-0 border-none">
          <VisuallyHidden>
            <DialogTitle>{post.post_name}</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>
        <div className="max-h-[90vh] overflow-y-auto rounded-3xl bg-background/80 backdrop-blur-2xl">
          <PostDetailContent post={post} user={user} isAdmin={isAdmin} isModal />
        </div>
      </DialogContent>
    </Dialog>
  );
}
