import { getPublicProfile } from "@/lib/data/profiles";
import { ProductsLocation } from "@/components/productsLocation/ProductLocation";
import { VolunteerCards } from "@/components/volunteerCard/VolonterCards";
import type { AllValuesType } from "@/api/profileAPI";

interface OneVolunteerProps {
  id: string;
}

/**
 * OneVolunteer Component (Server Component)
 * Displays a single volunteer's profile
 * Fetches data on the server using lib/data functions
 */
export default async function OneVolunteer({ id }: OneVolunteerProps) {
  // Fetch volunteer profile on the server
  const volunteer = await getPublicProfile(id);

  // Transform PublicProfile to AllValuesType format expected by VolunteerCards
  // Use empty strings for required fields that may be null
  const volunteerData: AllValuesType | null = volunteer ? {
    id: volunteer.id,
    first_name: volunteer.first_name || '',
    second_name: volunteer.second_name || '',
    nickname: volunteer.nickname || undefined,
    avatar_url: volunteer.avatar_url || '',
    about_me: volunteer.about_me || '',
    location: volunteer.location,
    created_time: volunteer.created_time || '',
    role: volunteer.role,
    updated_at: null,
    birth_date: '',
    phone: '',
  } : null;

  return (
    <div className="flex flex-col md:flex-row justify-between px-7 xl:px-20 mt-[24vh]">
      {!volunteerData || !Object.keys(volunteerData).length ? (
        <div className="h-[50px] bg-gray-200 animate-pulse rounded-lg" />
      ) : (
        <VolunteerCards indicator={"indicator"} volunteer={volunteerData} />
      )}
      <ProductsLocation indicator={"indicator"} />
    </div>
  );
}
