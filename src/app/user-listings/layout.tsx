import { generateNoIndexMetadata } from '@/lib/metadata';
import { NavbarWrapper } from '@/components/header/navbar/NavbarWrapper';

export const metadata = generateNoIndexMetadata(
  'My Listings',
  'Manage your food and item listings'
);

export default function UserListingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <NavbarWrapper />
      {children}
    </div>
  );
}
