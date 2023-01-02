import React from 'react';
import {Box, Button, GridItem, Heading, Image, SimpleGrid, Text} from "@chakra-ui/react";
import {opportunities} from "../../utils/mockArray";
import useMediaQuery from "../../utils/useMediaQuery";
import VolunteerInfoModal from "../../components/modals/VolunteerInfoModal";


const OpportunitiesPage = () => {
    const isSmallerThan500 = useMediaQuery('(min-width:500px)');
    const isSmallerThan700 = useMediaQuery('(min-width:700px)');
    const isSmallerThan1290 = useMediaQuery('(min-width:1290px)');

    const gridSize = () => {
        if (isSmallerThan1290) {
            return 6;
        }
        if (isSmallerThan700) {
            return 4;
        }
        if (isSmallerThan500) {
            return 2;
        }
    };
    return (
        <Box m="0 auto">
            <Box>
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d2417628.5557509!2d27.986708999999998!3d53.718878999999994!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sru!2sby!4v1672674216791!5m2!1sru!2sby"
                    width="100%" height="600" allowFullScreen loading="lazy"
                    style={{border: "0", borderRadius: "10px"}}
                    referrerPolicy="no-referrer-when-downgrade"></iframe>
            </Box>
            <Heading mt={10} mb={6} fontWeight={700} fontSize={"40px"}>Volunteer Opportunities</Heading>
            <SimpleGrid columns={gridSize()}
                        spacing={10}>
                {opportunities.map((item, id) => (
                    <GridItem mt='2' mb='2' key={id}>
                        <Image width="100%" cursor="pointer" borderRadius="10px"
                            // onClick={() => navigate("/oneProd", {state: {photo: item.img}})}
                               src={item.img}
                               alt="soup"/>
                        <Box>
                            <Heading mt={4} fontSize="22px">{item.name}</Heading>
                            <Text mt={2} fontSize="16px" noOfLines={1}>{item.about}</Text>
                            <VolunteerInfoModal/>
                        </Box>
                    </GridItem>
                ))}

            </SimpleGrid>
        </Box>
    );
};

export default OpportunitiesPage;