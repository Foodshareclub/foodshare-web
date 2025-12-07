import { SimpleNavbarWrapper } from '@/components/navigation/SimpleNavbarWrapper';

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SimpleNavbarWrapper />
      <main className="flex-1">{children}</main>
    </div>
  );
}
