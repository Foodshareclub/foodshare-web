import { NavbarWrapper } from '@/components/header/navbar/NavbarWrapper';

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavbarWrapper />
      {children}
    </div>
  );
}
