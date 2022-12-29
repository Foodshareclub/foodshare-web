import React from 'react';
import {CardBody, Flex, Heading, Image, Text} from "@chakra-ui/react";
import rose from "../../../assets/map.svg";

type AsideProdType = {
    img: string
    name: string,
    about: string,
    available: string
    distance: string
    height?:string
}
const AsideProducts: React.FC<AsideProdType> = ({height,img, name, about, available, distance}) => {
    return (
        <Flex
            direction={{base: 'column', sm: 'row'}}
            border={"2px solid #55BCB2"}
            borderRadius={10}
            mt={4}
            height={height?height: "inherit"}
        >
            <Image
                borderRadius="10%"
                p={2}
                objectFit='none'
                maxW={{base: '100%', sm: '200px'}}
                src={img}
                alt={img}
            />
            <CardBody lineHeight={2}>
                <Heading size='md'>{name}</Heading>
                <Heading noOfLines={1} size='md'>{about}</Heading>
                <Flex>
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