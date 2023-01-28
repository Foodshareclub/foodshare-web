import React from 'react';
import {Avatar, Box, Card, CardBody, Flex, Heading, Image, Stack} from "@chakra-ui/react";
import PublishListingModal from "../modals/PublishListingModal";
import peak from "@/assets/peakpx-min.jpg";
import {useAppSelector} from "@/hook";
import {
    imgURLSelector,
    userFirstNameSelector,
    userIdSelector,
    userSecondNameSelector
} from "@/store/slices/userSelectors";


const ListingPersonCard = () => {
    const imgUrl = useAppSelector(imgURLSelector);
    const userId = useAppSelector(userIdSelector);
    const userFirstName = useAppSelector(userFirstNameSelector);
    const userSecondName = useAppSelector(userSecondNameSelector);

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
                    src={imgUrl}
                    boxShadow={'2xl'}
                    css={{
                        border: '2px solid white',
                    }}
                />
            </Flex>

            <Stack alignSelf={"center"}>
                <CardBody>
                    <Heading textAlign={"center"} size='md'>
                        {userFirstName} {userSecondName}
                    </Heading>
                    <Box pt={5}><PublishListingModal
                        userID={userId}
                    /></Box>
                </CardBody>
            </Stack>
        </Card>
    );
};

export default ListingPersonCard;