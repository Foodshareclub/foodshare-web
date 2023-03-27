import React, {useState} from 'react';
import {MapContainer, Marker, TileLayer} from 'react-leaflet';
import './leaflet.css';
import 'leaflet/dist/leaflet.css';
import {Icon, LatLngExpression} from "leaflet";
import MarkerWhatEver from "@/components/leaflet/MarkerWhatEver";
import {useAppSelector} from "@/hook";
import {oneProductSelector} from "@/store";
import icon from "@/assets/location-blue.svg";
import {Skeleton} from "@chakra-ui/react";
//import MarkerClusterGroup from "react-leaflet-markercluster";

const Leaflet = () => {
    const oneProduct = useAppSelector(oneProductSelector);
    const defaultZoom = 12;
    // const disneyLandLatLng = [33.8121, -117.9190] as LatLngExpression;
    // const [location, setLocation] = useState(disneyLandLatLng);
    // const [valOne, setValOne] = useState(false);
    // const [valTwo, setValTwo] = useState(false);
    //
    // const handleOnSetView = (map: any) => {
    //     setValTwo(map)
    // }
    //
    // const handleOnFlyTo = (map: any) => {
    //     setValOne(map)
    // }
    const skater = new Icon({
        iconUrl: icon,
        iconSize: [25, 25],
        className: "custom-marker-cluster"
    });
    if (!oneProduct) return <Skeleton/>
    return (
        <div>
            <MapContainer
                style={{height: "78vh"}}
                center={[oneProduct.locations._longitude, oneProduct.locations._longitude]} zoom={defaultZoom}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                           attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"/>
                <Marker
                    icon={skater}
                    position={[oneProduct.locations._longitude, oneProduct.locations._longitude]}
                    title={oneProduct.post_name}></Marker>
                {/*<MarkerWhatEver location={location} setLocation={setLocation} valTwo={valTwo} valOne={valOne}*/}
                {/*                handleOnFlyTo={handleOnFlyTo}*/}
                {/*                handleOnSetView={handleOnSetView}/>*/}
            </MapContainer>
            {/*<div className="sidebar">*/}
            {/*    <button onClick={handleOnSetView}>*/}
            {/*        Set View to Disney World*/}
            {/*    </button>*/}
            {/*    <button onClick={handleOnFlyTo}>*/}
            {/*        Fly to London*/}
            {/*    </button>*/}

            {/*</div>*/}
        </div>
    );
}

export default Leaflet;
