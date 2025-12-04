import type { InitialProductStateType } from "@/types/product.types";

export type PublishListingModalType = {
  product?: InitialProductStateType;
  onClose: () => void;
  isOpen: boolean;
  setOpenEdit?: (value: boolean) => void;
  value?: string;
};

export type ImageItem = {
  id: string;
  url: string;
  file: File | null;
  filePath: string;
  isExisting?: boolean;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
};

export type RecentListing = {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  savedAt: number;
};

export type HistoryState = {
  title: string;
  description: string;
};

export type HistoryAction =
  | { type: "SET"; payload: HistoryState }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR" };

export type HistoryReducerState = {
  past: HistoryState[];
  present: HistoryState;
  future: HistoryState[];
};

export type CategoryKey = "food" | "things" | "borrow" | "wanted";

export type CategoryConfig = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
  hasExpiration: boolean;
  hasQuantity: boolean;
  hasDietary: boolean;
  hasCondition: boolean;
  tips: string[];
  placeholders: {
    title: string;
    description: string;
  };
};
