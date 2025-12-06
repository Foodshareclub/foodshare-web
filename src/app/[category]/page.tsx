import { redirect, notFound } from 'next/navigation';

// Valid category URL paths that should redirect to /s/[category]
// Note: 'food' is excluded because /food has its own route
const VALID_CATEGORIES = [
  'things',
  'borrow',
  'wanted',
  'fridges',
  'foodbanks',
  'organisations',
  'volunteers',
  'challenges',
  'zerowaste',
  'vegan',
  'community',
];

// Legacy singular paths that should redirect to plural
const LEGACY_REDIRECTS: Record<string, string> = {
  'thing': 'things',
  'fridge': 'fridges',
  'foodbank': 'foodbanks',
  'business': 'organisations',
  'volunteer': 'volunteers',
  // Note: 'challenge' has its own route at /challenge
};

interface PageProps {
  params: Promise<{ category: string }>;
}

/**
 * Catch-all category route handler
 * Redirects /{category} to /s/{category} for valid categories
 * 
 * Note: Static routes like /food, /challenge, /forum take precedence
 */
export default async function CategoryRedirectPage({ params }: PageProps) {
  const { category } = await params;
  const lowerCategory = category.toLowerCase();

  // Handle legacy singular paths
  if (LEGACY_REDIRECTS[lowerCategory]) {
    redirect(`/s/${LEGACY_REDIRECTS[lowerCategory]}`);
  }

  // Handle valid plural category paths
  if (VALID_CATEGORIES.includes(lowerCategory)) {
    // Special case: community goes to /forum
    if (lowerCategory === 'community') {
      redirect('/forum');
    }
    redirect(`/s/${lowerCategory}`);
  }

  // Unknown category - show 404
  notFound();
}
