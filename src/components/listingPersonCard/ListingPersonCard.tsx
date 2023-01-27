import React from 'react';
import {Avatar, Box, Card, CardBody, Flex, Heading, Image, Skeleton, Stack} from "@chakra-ui/react";
import PublishListingModal from "../modals/PublishListingModal";

import peak from "@/assets/peakpx-min.jpg";

type PropsType = {
    name: string
    secondName: string
    img: string
    userID: string
}

const ListingPersonCard: React.FC<PropsType> = ({
                                             name,
                                             secondName,
                                             img,
                                             userID,
                                         }) => {

    return (
        <Card
            direction={"column"}
            overflow='hidden'
            variant="unstyled"
        >
            <Image
                h={'200px'}
                w={'full'}
                src={peak}
                objectFit={'cover'}
            />
            {/*<Skeleton borderRadius="50%"*/}
            {/*          m={2}*/}
            {/*          isLoaded={true}>*/}
            <Flex justify={'center'} mt={-12}>
                <Avatar
                    size={'xl'}
                    src={img}
                    boxShadow={'2xl'}
                    css={{
                        border: '2px solid white',
                    }}
                />
            </Flex>

            <Stack alignSelf={"center"}>
                <CardBody>
                    <Heading textAlign={"center"} size='md'>
                        {name} {secondName}
                    </Heading>
                        <Box pt={5}><PublishListingModal userID={userID}/></Box>
                </CardBody>
            </Stack>
        </Card>
    );
};

export default ListingPersonCard;