import { generateNoIndexMetadata } from '@/lib/metadata';

export const metadata = generateNoIndexMetadata(
    'Edit Profile',
    'Update your personal information'
);

export default function ProfileEditLayout({ children }: { children: React.ReactNode }) {
    return children;
}
