import { generateNoIndexMetadata } from '@/lib/metadata';

export const metadata = generateNoIndexMetadata(
    'Login',
    'Sign in to your FoodShare account'
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return children;
}
