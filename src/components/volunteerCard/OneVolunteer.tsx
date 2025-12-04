'use client';

import React from "react";
import { useParams } from "next/navigation";
import { useOtherProfile } from "@/hooks/queries/useProfileQueries";
import { ProductsLocation } from "@/components/productsLocation/ProductLocation";
import { VolunteerCards } from "@/components/volunteerCard/VolonterCards";

/**
 * OneVolunteer Component
 * Displays a single volunteer's profile
 * Uses React Query instead of Redux for data fetching
 */
const OneVolunteer = () => {
  const params = useParams();
  const id = params?.id as string;

  // Fetch volunteer profile using React Query (replaces Redux thunk)
  const { data: volunteer, isLoading } = useOtherProfile(id);

  return (
    <div className="flex flex-col md:flex-row justify-between px-7 xl:px-20 mt-[24vh]">
      {!volunteer || !Object.keys(volunteer).length ? (
        <div className="h-[50px] bg-gray-200 animate-pulse rounded-lg" />
      ) : (
        <VolunteerCards indicator={"indicator"} volunteer={volunteer!} />
      )}
      <ProductsLocation indicator={"indicator"} />
    </div>
  );
};

export default OneVolunteer;
