import {GeoSearchControl, OpenStreetMapProvider} from 'leaflet-geosearch';
import {useMap} from 'react-leaflet';
import 'leaflet-geosearch/dist/geosearch.css';
import * as L from "leaflet";
import {Icon} from "leaflet";
import icon from "@/assets/location-blue.svg";

interface result {
    x: number; // lon
    y: number; // lat
    label: string; // formatted address
    bounds: [
        [number, number], // south, west - lat, lon
        [number, number], // north, east - lat, lon
    ];
    raw: any; // raw provider result
}

export const SearchMenu = () => {
    const provider = new OpenStreetMapProvider({
        params: {
            'accept-language': 'en',
            email: 'yarmoshkoden18m@gmail.com', // auth for large number of requests
        },
    });

    const skater = new Icon({
        iconUrl: icon || 'http://leafletjs.com/docs/images/logo.png',
        iconSize: [25, 25],
        // iconAnchor: [12, 41],
        // className: "custom-marker-cluster"
    });
    // @ts-ignore
    const searchControl = new GeoSearchControl({
        style: "button",
        notFoundMessage: 'Sorry, that address could not be found.',
        provider: provider,
        showMarker: true,
        retainZoomLevel: true,
        autoClose: true,
        autoCompleteDelay: 250,
        marker: {
            icon: skater,
            draggable: false,
        },
    });


    const map = useMap();
    map.addControl(searchControl);
    console.log(map.addControl(searchControl))
    return null;
};
