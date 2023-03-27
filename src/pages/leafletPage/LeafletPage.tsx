import React, {useEffect} from 'react';
import {Box, Skeleton} from "@chakra-ui/react";
import {MapContainer, Marker, TileLayer} from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import '../../components/leaflet/leaflet.css';
import {Icon} from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import icon from "@/assets/location-blue.svg";
import {useLocation} from "react-router-dom";
import {getProductsLocationTC, productsLocationSelector} from "@/store";
import {useActionCreators, useAppSelector} from "@/hook";
import {NavigateButtons, SearchMenu, UserLocationMarker} from '@/components';



const LeafletPage = () => {
    const location = useLocation();
    let type = location.pathname.split('/')[2];
    const actions = useActionCreators({getProductsLocationTC});
    const defaultZoom = 8;
    const locations = useAppSelector(productsLocationSelector);

    useEffect(() => {
        if (type) {
            actions.getProductsLocationTC(type);
        }
    }, [type])

    const skater = new Icon({
        iconUrl: icon || 'http://leafletjs.com/docs/images/logo.png',
        iconSize: [25, 25],
        // iconAnchor: [12, 41],
        className: "custom-marker-cluster"
    });
    if (!locations.length) return <Skeleton/>
    return (
        <Box
            // className="Leaflet"
            mt="19vh"
        >
            <NavigateButtons navigateTo={type} title={"Show lists"}/>
            <MapContainer style={{height: "81vh", zIndex: 0}}
                          center={[locations[0].locations._latitude, locations[0].locations._longitude]}
                          zoom={defaultZoom}>
                <SearchMenu/>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                           attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"/>
                <UserLocationMarker icon={skater}/>
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
                            position={[item.locations._latitude, item.locations._longitude]}
                            title={item.post_name}
                        ></Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>
        </Box>
    );
};

export default LeafletPage;