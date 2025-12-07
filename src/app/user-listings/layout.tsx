import { generateNoIndexMetadata } from '@/lib/metadata';
import { NavbarWrapper } from '@/components/header/navbar/NavbarWrapper';
import { getUser } from '@/app/actions/auth';

export const metadata = generateNoIndexMetadata(
  'My Listings',
  'Manage your food and item listings'
);

export default async function UserListingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  return (
    <div className="min-h-screen bg-background">
      <NavbarWrapper initialUser={user} />
      {children}
    </div>
  );
}
