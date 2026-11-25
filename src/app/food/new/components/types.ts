import {
  Apple,
  Building2,
  Camera,
  Car,
  ChefHat,
  ClipboardList,
  Code,
  Gift,
  Globe,
  HandHelping,
  HeartHandshake,
  Landmark,
  Leaf,
  Recycle,
  Refrigerator,
  Smartphone,
  Trophy,
  Users,
  Wrench,
} from "lucide-react";

export const VOLUNTEER_SKILLS = [
  { id: "driving", label: "Driving/Delivery", Icon: Car },
  { id: "cooking", label: "Cooking", Icon: ChefHat },
  { id: "organizing", label: "Organizing", Icon: ClipboardList },
  { id: "social", label: "Social Media", Icon: Smartphone },
  { id: "photo", label: "Photography", Icon: Camera },
  { id: "translation", label: "Translation", Icon: Globe },
  { id: "tech", label: "Tech/Coding", Icon: Code },
  { id: "outreach", label: "Community Outreach", Icon: HeartHandshake },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "evenings", label: "Evenings" },
  { value: "flexible", label: "Flexible" },
] as const;

export const POST_TYPE_OPTIONS = [
  { value: "food", label: "Food", Icon: Apple, iconClass: "text-red-500" },
  { value: "thing", label: "Things", Icon: Gift, iconClass: "text-purple-500" },
  { value: "borrow", label: "Borrow", Icon: Wrench, iconClass: "text-blue-500" },
  { value: "wanted", label: "Wanted", Icon: HandHelping, iconClass: "text-amber-500" },
  { value: "fridge", label: "Fridges", Icon: Refrigerator, iconClass: "text-cyan-500" },
  { value: "foodbank", label: "Food Banks", Icon: Landmark, iconClass: "text-indigo-500" },
  { value: "business", label: "Organisations", Icon: Building2, iconClass: "text-slate-500" },
  { value: "volunteer", label: "Volunteers", Icon: Users, iconClass: "text-emerald-500" },
  { value: "challenge", label: "Challenges", Icon: Trophy, iconClass: "text-yellow-500" },
  { value: "zerowaste", label: "Zero Waste", Icon: Recycle, iconClass: "text-green-500" },
  { value: "vegan", label: "Vegan", Icon: Leaf, iconClass: "text-lime-500" },
] as const;

export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
export const MAX_FILE_SIZE_MB = 10;
export const MAX_IMAGES = 4;

export interface NewListingFormData {
  post_name: string;
  post_description: string;
  post_type: string;
  available_hours: string;
  transportation: string;
  post_address: string;
  post_stripped_address: string;
  volunteer_skills: string[];
}
