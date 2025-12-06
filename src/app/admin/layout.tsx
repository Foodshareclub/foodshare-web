import { generateNoIndexMetadata } from '@/lib/metadata';

export const metadata = generateNoIndexMetadata(
  'Admin Dashboard',
  'FoodShare administration panel'
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
