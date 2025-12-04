import type { CountryType } from "@/api/profileAPI";
import { supabase } from "@/lib/supabase/client";

// Configuration
const MAX_FETCH_SIZE = 250; // Adjust based on your database size
const ROWS_PER_PAGE = 100; // Adjust to control the amount of data loaded per scroll

// Function to fetch all countries in chunks
export async function getAllCountries() {
  let allCountries: CountryType[] = [];
  let nextPageToken = 0;
  let pageCount = 1;

  while (nextPageToken < MAX_FETCH_SIZE) {
    const { data, error } = await supabase
      .from("countries")
      .select("*")
      .range(nextPageToken, nextPageToken + ROWS_PER_PAGE);

    if (error) {
      console.error("Error fetching countries:", error);
      return; // Stop if there's an error
    }

    allCountries = [...allCountries, ...data];
    nextPageToken += ROWS_PER_PAGE;
    pageCount++;


  }

  return allCountries;
}
