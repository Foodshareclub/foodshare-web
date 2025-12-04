import type { FC, ReactNode } from "react";
import React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export type PlacementType = "top" | "bottom" | "start" | "end";

type UniversalDrawerType = {
  onClose: () => void;
  isOpen: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
  children: ReactNode;
  headerValue?: string;
  placement: PlacementType;
};

const UniversalDrawer: FC<UniversalDrawerType> = ({
  placement,
  headerValue,
  onClose,
  isOpen,
  size,
  children,
}) => {
  // Map Chakra placement to shadcn position
  const positionMap: Record<PlacementType, "left" | "right" | "top" | "bottom"> = {
    start: "left",
    end: "right",
    top: "top",
    bottom: "bottom",
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent position={positionMap[placement]} variant="glass">
        {headerValue && (
          <DrawerHeader>
            <DrawerTitle>{headerValue}</DrawerTitle>
          </DrawerHeader>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
};

export default UniversalDrawer;
