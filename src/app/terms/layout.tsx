import { NavbarWrapper } from '@/components/header/navbar/NavbarWrapper';

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NavbarWrapper />
      {children}
    </div>
  );
}
