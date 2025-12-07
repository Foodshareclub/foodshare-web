import { NavbarWrapper } from '@/components/header/navbar/NavbarWrapper';

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavbarWrapper />
      <main className="flex-1">{children}</main>
    </div>
  );
}
