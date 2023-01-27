import React from 'react';
import {Avatar, Box, Card, CardBody, Flex, Heading, Image, Skeleton, Stack} from "@chakra-ui/react";
import PublishListingModal from "../../components/modals/PublishListingModal";
import {useLocation} from "react-router-dom";

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
    const url = useLocation();
    return (
        <Card
            direction={"column"}
            overflow='hidden'
            variant="unstyled"
            mt={4} mb={4}
        >
            <Image
                h={'200px'}
                w={'full'}
                src={
                    'https://images.unsplash.com/photo-1612865547334-09cb8cb455da?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=634&q=80'
                }
                objectFit={'cover'}
            />
            {/*<Skeleton borderRadius="50%"*/}
            {/*          m={2}*/}
            {/*          isLoaded={true}>*/}
            <Flex justify={'center'} mt={-12}>
                <Avatar
                    size={'xl'}
                    src={
                        img
                        // 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&q=80&fm=jpg&crop=faces&fit=crop&h=200&w=200&ixid=eyJhcHBfaWQiOjE3Nzg0fQ'
                    }
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