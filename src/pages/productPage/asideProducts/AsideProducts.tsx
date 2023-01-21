import React from 'react';
import {Button, Card, CardBody, CardFooter, Flex, Heading, Image, Stack, Text} from "@chakra-ui/react";
import rose from "../../../assets/map.svg";
import {useNavigate} from "react-router-dom";

type AsideProdType = {
    img: string
    name: string,
    about: string,
    available: string
    distance: string
    height?: string
    product?: any
}
const AsideProducts: React.FC<AsideProdType> = ({product, height, img, name, about, available, distance}) => {
    const navigate = useNavigate();
    const clicker = () => {
        navigate('/oneProd', {state: product})
    }


    return (
        <Card
            direction={{base: 'column', sm: 'row'}}
            overflow='hidden'
            variant='outline'
            mt={4}
        >
            <Image
                borderRadius="10%"
                p={2}
                objectFit='none'
                width="30%" height={150}
                // maxW={{base: '100%', sm: '200px'}}
                src={img}
                alt={img}
            />

            <Stack>
                <CardBody>
                    <Heading size='sm'>{name}</Heading>
                    <Heading mb={1} noOfLines={1} size='sm'>{about}</Heading>

                    <Flex mb={1}>
                        <Heading size='sm'>Available:</Heading>
                        <Text pl='2'>
                            {available}
                        </Text>
                    </Flex>

                    <Flex>
                        <Heading size='sm'>Distance:</Heading>
                        <Text pl='2'>
                            {distance}
                        </Text>
                        <Image width={30} pl={4} src={rose} alt={rose}/>
                    </Flex>

                </CardBody>
            </Stack>
        </Card>
    );
};

export default AsideProducts;