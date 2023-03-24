import React, {useEffect, useState} from 'react';
import {Box, Skeleton} from "@chakra-ui/react";
import {MapContainer, Marker, TileLayer} from "react-leaflet";
import '../../components/leaflet/leaflet.scss';
import 'leaflet/dist/leaflet.css';
import {Icon} from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import icon from "@/assets/location-blue.svg";
import {useLocation} from "react-router-dom";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import {productAPI} from "@/api";
import {LocationType} from "@/api/productAPI";

const LeafletPage = () => {
    const location = useLocation();
    let type = location.pathname.split('/')[2];
    const [locations, setLocation] = useState<LocationType[] | undefined>()
    const defaultZoom = 8;

    useEffect(() => {
        productAPI.getProductsLocation(type).then(({data}) => data && setLocation(data));
    }, [type])

    const skater = new Icon({
        iconUrl: icon,
        iconSize: [25, 25],
        className: "custom-marker-cluster"
    });
    if (!locations) return <Skeleton/>
    return (
        <Box
            // className="Leaflet"
            mt="19vh"
        >
            <NavigateButtons navigateTo={type} title={"Show lists"}/>
            <MapContainer style={{height: "81vh", zIndex: 0}}
                          center={[locations[0].locations._latitude, locations[0].locations._longitude]}
                          zoom={defaultZoom}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                           attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"/>

                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={150}
                    spiderfyOnMaxZoom={true}
                    showCoverageOnHover={true}
                >
                    {locations.map((item, index) => (
                        <Marker
                            icon={skater}
                            key={index}
                            position={[item["locations"]._latitude, item["locations"]._longitude]}
                            title={item.post_name}
                        ></Marker>
                    ))}
                </MarkerClusterGroup>

            </MapContainer>
        </Box>
    );
};

export default LeafletPage;