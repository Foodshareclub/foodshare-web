import type { FC } from "react";
import React from "react";
import type { UsePositionSettings } from "@/hooks/usePosition";
import { usePosition } from "@/hooks/usePosition";
import { LocationPermissionBanner } from "@/components/LocationPermissionBanner";
import Leaflet from "@/components/leaflet/Leaflet";

type PropsType = {
  watch: boolean;
  settings: UsePositionSettings;
};

export const Demo: FC<PropsType> = ({ watch, settings }) => {
  const {
    latitude,
    longitude,
    timestamp,
    accuracy,
    speed,
    heading,
    error,
    isLoading,
    accuracyLevel,
    retry,
  } = usePosition(watch, settings);

  const loader =
    isLoading && !latitude ? (
      <>
        <div>Trying to fetch location...</div>
        <br />
      </>
    ) : null;

  return (
    <div className="flex flex-col gap-4 mt-[25vh] items-stretch">
      <LocationPermissionBanner
        error={error}
        isLoading={isLoading}
        accuracyLevel={accuracyLevel}
        onRetry={retry}
        showAccuracyInfo={true}
      />

      {loader}

      <div>
        <code>
          latitude: {latitude ?? "N/A"}
          <br />
          longitude: {longitude ?? "N/A"}
          <br />
          timestamp: {timestamp ? new Date(timestamp).toLocaleTimeString() : "N/A"}
          <br />
          accuracy: {accuracy ? `${accuracy} meters` : "N/A"}
          <br />
          accuracyLevel: {accuracyLevel ?? "N/A"}
          <br />
          speed: {speed ?? "N/A"}
          <br />
          heading: {heading ? `${heading} degrees` : "N/A"}
          <br />
          error: {error?.userFriendlyMessage ?? "None"}
        </code>
      </div>

      <Leaflet />
    </div>
  );
};
