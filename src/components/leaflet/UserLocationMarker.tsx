import {Circle, FeatureGroup, Marker, Popup, useMapEvents} from "react-leaflet";
import {FC, useState} from "react";
import {Icon, IconOptions, LatLng} from "leaflet";

type LocationMarkerType = {
    icon: Icon<IconOptions>
}
const UserLocationMarker: FC<LocationMarkerType> = ({icon}) => {
    const fillBlueOptions = {fillColor: 'blue'}
    const [position, setPosition] = useState<LatLng | null>(null)
    const map = useMapEvents({
        click() {
            map.locate();
        },
        locationfound(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    })


    return position === null ? null : (
        <FeatureGroup pathOptions={fillBlueOptions}>
            <Marker icon={icon} position={position}>
            </Marker>
            <Popup>Your location here</Popup>
            <Circle center={position} radius={6000}/>
        </FeatureGroup>
    )
}
export default UserLocationMarker;