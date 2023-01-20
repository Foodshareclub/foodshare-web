import React from 'react';
import {CardBody, Flex, Heading, Image, Text} from "@chakra-ui/react";
import rose from "../../../assets/map.svg";
import {useNavigate} from "react-router-dom";

type AsideProdType = {
    img: string
    name: string,
    about: string,
    available: string
    distance: string
    height?:string
    product?: any
}
const AsideProducts: React.FC<AsideProdType> = ({product, height,img, name, about, available, distance}) => {
const navigate = useNavigate();
    const clicker = () => {
        navigate('/oneProd', {state: product})
    }


    return (
        <Flex
            direction={{base: 'column', sm: 'row'}}
            border={"2px solid #55BCB2"}
            borderRadius={10}
            mt={4}
            height={height?height: "inherit"}
            cursor="pointer"
            onClick={clicker}
        >
            <Image
                borderRadius="10%"
                p={2}
                objectFit='none'
                maxW={{base: '100%', sm: '200px'}}
                src={img}
                alt={img}
            />
            <CardBody >
                <Heading mb={3} size='md'>{name}</Heading>
                <Heading mb={1} noOfLines={1} size='md'>{about}</Heading>
                <Flex mb={1}>
                    <Heading alignSelf={"center"} size='md'>Available:</Heading>
                    <Text pl='2'>
                        {available}
                    </Text>
                </Flex>
                <Flex>
                    <Heading alignSelf={"center"} size='md'>Distance:</Heading>
                    <Text pl='2'>
                        {distance}
                    </Text>
                    <Image pl={4} src={rose} alt={rose}/>
                </Flex>
            </CardBody>

        </Flex>
    );
};

export default AsideProducts;