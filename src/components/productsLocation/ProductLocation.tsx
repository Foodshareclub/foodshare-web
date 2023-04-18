import {Flex, Skeleton} from "@chakra-ui/react";
import React from "react";
import {useAppSelector} from "@/hook";
import {oneProductSelector} from "@/store";
import {Icon} from "leaflet";
import icon from "@/assets/location-blue.svg";
import {MapContainer, Marker, TileLayer} from "react-leaflet";

type LocationType = {
    indicator?: string
}

export const ProductsLocation: React.FC<LocationType> = ({indicator}) => {
    const oneProduct = useAppSelector(oneProductSelector);
    const defaultZoom = 12;

    const skater = new Icon({
        iconUrl: icon,
        iconSize: [25, 25],
        className: "custom-marker-cluster"
    });
    if (!oneProduct) return <Skeleton/>
    return (
        <Flex direction={"column"} justify={"center"} w={{md: indicator ? "70%" : "50%", base: "100%"}}>
            <MapContainer
                style={{height: "85vh"}}
                center={[oneProduct.locations._latitude, oneProduct.locations._longitude]} zoom={defaultZoom}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                           attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"/>
                <Marker
                    icon={skater}
                    position={[oneProduct.locations._latitude, oneProduct.locations._longitude]}
                    title={oneProduct.post_name}></Marker>
            </MapContainer>
        </Flex>

    )
}