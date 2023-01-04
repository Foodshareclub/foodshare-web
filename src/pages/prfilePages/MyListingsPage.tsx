import React from 'react';
import {Box, Flex, Heading} from "@chakra-ui/react";
import PersonCard from "../personCard/PersonCard";
import den from "../../assets/den.jpg"
import {asideProdProperty, commentsArray} from "../../utils/mockArray";
import AsideProducts from "../productPage/asideProducts/AsideProducts";
import Comments from "../../components/comments/Comments";

const MyListingsPage = () => {
    return (
        <Flex justify="space-between" mt={6}>
            <Box w="45%">
                <PersonCard
                    aboutMe={'Lorem ipsum dolor sit amet, consectetur adipisicing elit. A, ducimusLorem ipsum dolor sit amet, consectetur adipisicing elit. A, ducimus.'}
                    exp={"experience"} img={den} name={"denis"}/>
                <Heading mt={8} textAlign={"start"}>Reviews Given</Heading>
                {commentsArray.map((item, id) => (
                    <Comments key={id} comment={item.comment} date={item.date} img={item.img} name={item.name}
                              rating={item.rating}/>
                ))}
            </Box>
            <Box w="45%">
                <Heading textAlign={"start"}>Active Listings</Heading>
                {asideProdProperty.map((item, id) => (
                    <AsideProducts key={id} img={item.img} name={item.name} about={item.about}
                                   available={item.available} distance={item.distance} height="25%"/>
                ))}
            </Box>
        </Flex>
    );
};

export default MyListingsPage;