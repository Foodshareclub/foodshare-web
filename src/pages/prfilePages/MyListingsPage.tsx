import React from 'react';
import {Box, Flex, Heading} from "@chakra-ui/react";
import PersonCard from "../personCard/PersonCard";
import {asideProdProperty, commentsArray} from "../../utils/mockArray";
import AsideProducts from "../productPage/asideProducts/AsideProducts";
import Comments from "../../components/comments/Comments";
import {useAppSelector} from "../../hook/hooks";
import {Trans} from "@lingui/macro";

const MyListingsPage = () => {
    const user = useAppSelector(state => state.user);

    return (
        <Flex justify="space-between" mt={6}>
            <Box w="45%">
                <PersonCard
                    aboutMe={user.value.about_me}
                    exp={"experience"}
                    img={user.imgUrl}
                    name={user.session.user.user_metadata.firstName}
                    secondName={user.session.user.user_metadata.lastName}
                    userID={user.value.id}
                />

                <Heading
                    mt={8}
                    textAlign={"start"}
                >
                    <Trans>Reviews Given</Trans>
                </Heading>

                {commentsArray.map((item, id) => (
                    <Comments
                        key={id}
                        comment={item.comment}
                        date={item.date}
                        img={item.img}
                        name={item.name}
                        rating={item.rating}
                    />
                ))}
            </Box>

            <Box w="45%">
                <Heading
                    textAlign={"start"}
                >
                    <Trans>Active Listings</Trans>
                </Heading>

                {asideProdProperty.map((item, id) => (
                    <AsideProducts
                        key={id}
                        img={item.img}
                        name={item.name}
                        about={item.about}
                        available={item.available}
                        distance={item.distance}
                        height="25%"
                    />
                ))}
            </Box>
        </Flex>
    );
};

export default MyListingsPage;