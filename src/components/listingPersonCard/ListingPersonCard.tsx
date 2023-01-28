import React from 'react';
import {Avatar, Box, Card, CardBody, Flex, Heading, Image, Skeleton, Stack} from "@chakra-ui/react";
import PublishListingModal from "../modals/PublishListingModal";
import peak from "@/assets/peakpx-min.jpg";
import {useAppSelector} from "@/hook";


const ListingPersonCard =() => {
    const img = useAppSelector(state => state.user.imgUrl);
const user = useAppSelector(state => state.user.value);

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
                        {user.first_name} {user.second_name}
                    </Heading>
                        <Box pt={5}><PublishListingModal
                            userID={user.id}
                        /></Box>
                </CardBody>
            </Stack>
        </Card>
    );
};

export default ListingPersonCard;