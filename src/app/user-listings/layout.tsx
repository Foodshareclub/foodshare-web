import { generateNoIndexMetadata } from '@/lib/metadata';

export const metadata = generateNoIndexMetadata(
  'My Listings',
  'Manage your food and item listings'
);

export default function UserListingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
