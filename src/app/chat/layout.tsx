import { generateNoIndexMetadata } from '@/lib/metadata';
import { NavbarWrapper } from '@/components/header/navbar/NavbarWrapper';

export const metadata = generateNoIndexMetadata(
    'Messages',
    'Chat with food sharers in your community'
);

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <NavbarWrapper />
            {children}
        </div>
    );
}
