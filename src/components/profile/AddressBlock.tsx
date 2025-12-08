'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllCountries } from "@/hooks";
import { profileAPI, type AddressType, type CountryType } from "@/api/profileAPI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AddressBlockType = {
  address: AddressType;
  a: boolean;
  b: boolean;
  c: boolean;
  d: boolean;
  setA: (value: boolean) => void;
  setB: (value: boolean) => void;
  setC: (value: boolean) => void;
  /** Countries list passed from server */
  countries?: CountryType[];
};

/**
 * AddressBlock Component
 * Displays and edits user address information
 * Receives countries as props from Server Component
 */
export const AddressBlock: React.FC<AddressBlockType> = ({
  a,
  b,
  c,
  d,
  address,
  setC,
  setA,
  setB,
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

  const userCountry = (
    address.country ? { id: address.country, name: "" } : null
  ) as CountryType | null;

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

  const onSaveHandler = async () => {
    await profileAPI.updateAddress(addressObject);
  };

  return (
    <div className="glass rounded-xl p-4 mb-4">
      <div className="flex">
        <div className="w-full max-w-screen-lg">
          <h2 className="text-2xl font-medium pb-2 text-left text-foreground">
            Address
          </h2>
          {edit ? (
            <>
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">
                  "Address Line 1 *"
                </label>
                <Input
                  variant="glass"
                  placeholder="Address Line 1"
                  value={lineOne}
                  onChange={(e) => setLineOne(e.currentTarget.value)}
                />
              </div>

              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">
                  "Address Line 2"
                </label>
                <Input
                  variant="glass"
                  placeholder="Address Line 2"
                  value={lineTwo}
                  onChange={(e) => setLineTwo(e.currentTarget.value)}
                />
              </div>

              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">
                  "City *"
                </label>
                <Input
                  variant="glass"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.currentTarget.value)}
                />
              </div>

              <div className="flex justify-between gap-4 mt-2">
                <div className="w-[45%]">
                  <label className="block text-sm font-medium mb-1">
                    "State/Province *"
                  </label>
                  <Input
                    variant="glass"
                    placeholder="State/Province"
                    value={province}
                    onChange={(e) => setProvince(e.currentTarget.value)}
                  />
                </div>
                <div className="w-[45%]">
                  <label className="block text-sm font-medium mb-1">
                    "County *"
                  </label>
                  <Input
                    variant="glass"
                    placeholder="County"
                    value={county}
                    onChange={(e) => setCounty(e.currentTarget.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between gap-4 mt-2">
                <div className="w-[45%]">
                  <label className="block text-sm font-medium mb-1">
                    "Zip/Postal Code *"
                  </label>
                  <Input
                    variant="glass"
                    placeholder="Zip/Postal Code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.currentTarget.value)}
                  />
                </div>
                <div className="w-[45%]">
                  <label className="block text-sm font-medium mb-1">
                    "Country"
                  </label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger variant="glass">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent variant="glass">
                      {allCountries.map((item: CountryType, index: number) => (
                        <SelectItem key={index} value={item.id.toString()}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                variant="glass-accent"
                onClick={async () => {
                  await onSaveHandler();
                  setA(!a);
                  setB(!b);
                  setC(!c);
                  setEdit(!edit);
                  router.refresh();
                }}
                className="my-3"
              >
                Save
              </Button>
            </>
          ) : (
            <p className="text-foreground">
              Use a permanent address where you can receive mail.
            </p>
          )}
        </div>
        <Button
          variant="glass"
          className={`self-start ${d ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          onClick={() => {
            setA(!a);
            setB(!b);
            setC(!c);
            setEdit(!edit);
          }}
        >
          {edit ? "Cancel" : "Edit"}
        </Button>
      </div>
    </div>
  );
};
