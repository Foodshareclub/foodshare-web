import React, {FC} from 'react';
import PropTypes from 'prop-types';
import {usePosition} from "@/hook/usePosition";
import {Box} from "@chakra-ui/react";

import Leaflet from "@/components/leaflet/Leaflet";

type PropsType = {
    watch: boolean,
    settings: object,
};
export const Demo: FC<PropsType> = ({watch, settings}) => {
    // @ts-ignore
    const {latitude, longitude, timestamp, accuracy, speed, heading, error} = usePosition(watch, settings);

    const loader = !latitude && !error ? (
        <>
            <div>Trying to fetch location...</div>
            <br/>
        </>
    ) : null;

    return (
        <Box mt="25vh">
            {loader}
            <code>
                latitude: {latitude}<br/>
                longitude: {longitude}<br/>
                timestamp: {new Date(timestamp).toLocaleTimeString()}<br/>
                accuracy: {accuracy && `${accuracy} meters`}<br/>
                speed: {speed}<br/>
                heading: {heading && `${heading} degrees`}<br/>
                error: {error}
            </code>
            <Leaflet/>
        </Box>
    );
};
// Demo.prototype.propTypes = {
//     watch: PropTypes.bool,
//     settings: PropTypes.object,
// };
