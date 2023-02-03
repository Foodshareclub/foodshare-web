import React from 'react';
import {useLocation} from "react-router-dom";
import {Box} from "@chakra-ui/react";

const OneVolunteer = () => {
    const url = useLocation().pathname.split('/')[2];
    console.log(url)
    return (
        <Box mt={"25vh"}>
            One volunteer
        </Box>
    );
};

export default OneVolunteer;