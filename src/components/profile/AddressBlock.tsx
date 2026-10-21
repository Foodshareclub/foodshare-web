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
    <div className="glass rounded-xl p-4 mb-4">
      <div className="flex">
        <div className="w-full max-w-screen-lg">
          <h2 className="text-2xl font-medium pb-2 text-start text-foreground">Address</h2>
          {edit ? (
            <>
              <div className="mt-2">
                <label htmlFor="address-line-one" className="block text-sm font-medium mb-1">
                  Address Line 1 *
                </label>
                <Input
                  id="address-line-one"
                  variant="glass"
                  placeholder="Address Line 1"
                  value={lineOne}
                  onChange={(e) => setLineOne(e.currentTarget.value)}
                />
              </div>

              <div className="mt-2">
                <label htmlFor="address-line-two" className="block text-sm font-medium mb-1">
                  Address Line 2
                </label>
                <Input
                  id="address-line-two"
                  variant="glass"
                  placeholder="Address Line 2"
                  value={lineTwo}
                  onChange={(e) => setLineTwo(e.currentTarget.value)}
                />
              </div>

              <div className="mt-2">
                <label htmlFor="address-city" className="block text-sm font-medium mb-1">
                  City *
                </label>
                <Input
                  id="address-city"
                  variant="glass"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.currentTarget.value)}
                />
              </div>

              <div className="flex justify-between gap-4 mt-2">
                <div className="w-[45%]">
                  <label htmlFor="address-province" className="block text-sm font-medium mb-1">
                    State/Province *
                  </label>
                  <Input
                    id="address-province"
                    variant="glass"
                    placeholder="State/Province"
                    value={province}
                    onChange={(e) => setProvince(e.currentTarget.value)}
                  />
                </div>
                <div className="w-[45%]">
                  <label htmlFor="address-county" className="block text-sm font-medium mb-1">
                    County *
                  </label>
                  <Input
                    id="address-county"
                    variant="glass"
                    placeholder="County"
                    value={county}
                    onChange={(e) => setCounty(e.currentTarget.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between gap-4 mt-2">
                <div className="w-[45%]">
                  <label htmlFor="address-postal-code" className="block text-sm font-medium mb-1">
                    Zip/Postal Code *
                  </label>
                  <Input
                    id="address-postal-code"
                    variant="glass"
                    placeholder="Zip/Postal Code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.currentTarget.value)}
                  />
                </div>
                <div className="w-[45%]">
                  <label htmlFor="address-country" className="block text-sm font-medium mb-1">
                    Country
                  </label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="address-country" variant="glass">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent variant="glass">
                      {allCountries.map((item: CountryType) => (
                        <SelectItem key={item.id.toString()} value={item.id.toString()}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button variant="glass-accent" onClick={onSaveHandler} className="my-3">
                Save
              </Button>
            </>
          ) : (
            <p className="text-foreground">Use a permanent address where you can receive mail.</p>
          )}
        </div>
        <Button
          variant="glass"
          className={`self-start ${disableAddressEdit ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          onClick={toggleEditMode}
        >
          {edit ? "Cancel" : "Edit"}
        </Button>
      </div>
    </div>
  );
};
