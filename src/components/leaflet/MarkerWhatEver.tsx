"use client";

import type { LatLngExpression } from "leaflet";
import { Icon } from "leaflet";
import type { FC } from "react";
import React, { useEffect } from "react";
import { Circle, Marker, Popup, useMap } from "react-leaflet";
import icon from "@/assets/location-red.svg";

type MarkerType = {
  valOne: boolean;
  valTwo: boolean;
  handleOnFlyTo: (map: boolean) => void;
  handleOnSetView: (map: boolean) => void;
  setLocation: (location: LatLngExpression) => void;
  location: LatLngExpression;
};
const MarkerWhatEver: FC<MarkerType> = ({
  location,
  valOne,
  handleOnFlyTo,
  setLocation,
  handleOnSetView,
  valTwo,
}) => {
  const skater = new Icon({
    iconUrl: icon.src,
    iconSize: [25, 25],
  });

  const map = useMap();
  const london = [51.507351, -0.127758] as LatLngExpression;
  const africa = [-8.783195, 34.508522] as LatLngExpression;

  const mapFlyTo = () => {
    handleOnFlyTo(!valOne);
    setLocation(london);
    map.flyTo(london, 14, {
      duration: 2,
    });
  };
  const setView = () => {
    handleOnSetView(!valTwo);
    setLocation(africa);
    map.flyTo(africa, 14, {
      duration: 2,
    });
    //map.setView([54.317749, 26.871780], 14);
  };

  useEffect(() => {
    if (valOne) mapFlyTo();
    if (valTwo) setView();
  }, [valOne, valTwo]);
  return (
    <div>
      {/*для того,чтоб обьединить локации в одну*/}
      {/*<MarkerClusterGroup>*/}
      {/*<Marker  position={[53.904541, 27.561523]} />*/}
      {/*    <Marker position={[52.2297, 21.0122]} />*/}
      {/*    <Marker position={[51.5074, -0.0901]} />*/}
      {/*</MarkerClusterGroup>*/}

      <Marker
        icon={skater}
        position={location}
        eventHandlers={{
          click: (e) => {},
        }}
      >
        <Popup>
          A pretty CSS3 popup. <br /> Easily customizable.
        </Popup>
      </Marker>
    </div>
  );
};
export default MarkerWhatEver;
