"use client";

import type { AddressType, CountryType } from "@/api/profileAPI";
import { updateAddressDirect } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllCountries } from "@/hooks/getAllCountries";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

interface AddressBlockProps {
  address: AddressType;
  /** Whether the address edit button should be disabled (another field is being edited) */
  disableAddressEdit: boolean;
  /** Current state of name edit disable flag */
  disableNameEdit: boolean;
  /** Current state of email edit disable flag */
  disableEmailEdit: boolean;
  /** Current state of phone edit disable flag */
  disablePhoneEdit: boolean;
  /** Toggle name edit disable state */
  setDisableNameEdit: (value: boolean) => void;
  /** Toggle email edit disable state */
  setDisableEmailEdit: (value: boolean) => void;
  /** Toggle phone edit disable state */
  setDisablePhoneEdit: (value: boolean) => void;
  /** Countries list passed from server */
  countries?: CountryType[];
}

/**
 * AddressBlock Component
 * Displays and edits user address information
 * Receives countries as props from Server Component
 */
export const AddressBlock: React.FC<AddressBlockProps> = ({
  address,
  disableAddressEdit,
  disableNameEdit,
  disableEmailEdit,
  disablePhoneEdit,
  setDisableNameEdit,
  setDisableEmailEdit,
  setDisablePhoneEdit,
  countries: propCountries,
}) => {
  const router = useRouter();

  // Use prop countries or fetch client-side as fallback
  const [allCountries, setAllCountries] = useState<CountryType[]>(propCountries || []);

  useEffect(() => {
    if (!propCountries || propCountries.length === 0) {
      getAllCountries().then((countries) => {
        if (countries) setAllCountries(countries);
      });
    }
  }, [propCountries]);

  const userCountry = (address.country ? { id: address.country, name: "" } : null) as CountryType | null;

  const [edit, setEdit] = useState(false);
  const [lineOne, setLineOne] = useState(address.address_line_1);
  const [lineTwo, setLineTwo] = useState(address.address_line_2);
  const [province, setProvince] = useState(address.state_province);
  const [country, setCountry] = useState(userCountry?.id?.toString() || "");
  const [postalCode, setPostalCode] = useState(address.postal_code);
  const [city, setCity] = useState(address.city);
  const [county, setCounty] = useState(address.county);

  const addressObject = {
    ...address,
    address_line_1: lineOne,
    address_line_2: lineTwo,
    county: county,
    country: Number(country) || address.country,
    city: city,
    state_province: province,
    postal_code: postalCode,
    profile_id: address.profile_id,
  };

  const toggleEditMode = () => {
    // Toggle edit mode and disable/enable other blocks
    setDisableNameEdit(!disableNameEdit);
    setDisableEmailEdit(!disableEmailEdit);
    setDisablePhoneEdit(!disablePhoneEdit);
    setEdit(!edit);
  };

  const onSaveHandler = async () => {
    await updateAddressDirect(addressObject);
    toggleEditMode();
    router.refresh();
  };

  return (
    <div className="flex justify-between items-start gap-4 rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl p-6 shadow-xs hover:shadow-md transition-all mb-4">
      <div className="w-full max-w-screen-lg">
        <h2 className="text-base font-semibold text-foreground">Address</h2>
        {edit ? (
          <>
            <div className="mt-3">
              <label
                htmlFor="address-line-one"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
              >
                Address Line 1 *
              </label>
              <Input
                id="address-line-one"
                placeholder="Address Line 1"
                value={lineOne}
                onChange={(e) => setLineOne(e.currentTarget.value)}
                className="h-11 rounded-xl border border-border/80 bg-background/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm px-4 transition-all"
              />
            </div>

            <div className="mt-3">
              <label
                htmlFor="address-line-two"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
              >
                Address Line 2
              </label>
              <Input
                id="address-line-two"
                placeholder="Address Line 2"
                value={lineTwo}
                onChange={(e) => setLineTwo(e.currentTarget.value)}
                className="h-11 rounded-xl border border-border/80 bg-background/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm px-4 transition-all"
              />
            </div>

            <div className="mt-3">
              <label
                htmlFor="address-city"
                className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
              >
                City *
              </label>
              <Input
                id="address-city"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.currentTarget.value)}
                className="h-11 rounded-xl border border-border/80 bg-background/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm px-4 transition-all"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-3">
              <div className="w-full sm:w-[48%]">
                <label
                  htmlFor="address-province"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
                >
                  State/Province *
                </label>
                <Input
                  id="address-province"
                  placeholder="State/Province"
                  value={province}
                  onChange={(e) => setProvince(e.currentTarget.value)}
                  className="h-11 rounded-xl border border-border/80 bg-background/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm px-4 transition-all"
                />
              </div>
              <div className="w-full sm:w-[48%]">
                <label
                  htmlFor="address-county"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
                >
                  County *
                </label>
                <Input
                  id="address-county"
                  placeholder="County"
                  value={county}
                  onChange={(e) => setCounty(e.currentTarget.value)}
                  className="h-11 rounded-xl border border-border/80 bg-background/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm px-4 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-3">
              <div className="w-full sm:w-[48%]">
                <label
                  htmlFor="address-postal-code"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
                >
                  Zip/Postal Code *
                </label>
                <Input
                  id="address-postal-code"
                  placeholder="Zip/Postal Code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.currentTarget.value)}
                  className="h-11 rounded-xl border border-border/80 bg-background/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm px-4 transition-all"
                />
              </div>
              <div className="w-full sm:w-[48%]">
                <label
                  htmlFor="address-country"
                  className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
                >
                  Country
                </label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger
                    id="address-country"
                    className="h-11 rounded-xl border border-border/80 bg-background/80 focus:border-brand focus:ring-2 focus:ring-brand/20 text-sm px-4 transition-all"
                  >
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-xl">
                    {allCountries.map((item: CountryType) => (
                      <SelectItem key={item.id.toString()} value={item.id.toString()}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={onSaveHandler}
              className="mt-4 h-10 px-5 rounded-xl bg-brand hover:bg-brand-hover active:scale-95 text-white font-semibold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              Save
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">Use a permanent address where you can receive mail.</p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className={`rounded-full text-xs font-semibold px-4 border border-border/80 hover:bg-muted/60 transition-all cursor-pointer shrink-0 ${
          disableAddressEdit ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
        onClick={toggleEditMode}
      >
        {edit ? "Cancel" : "Edit"}
      </Button>
    </div>
  );
};
