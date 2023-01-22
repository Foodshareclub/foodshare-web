import React from 'react';
import {Card, CardBody, Flex, Heading, Icon, Image, Stack, Text} from "@chakra-ui/react";
import rose from "../../../assets/map.svg";
import {useLocation, useNavigate} from "react-router-dom";
import {Trans} from "@lingui/macro";
import {DeleteIcon, EditIcon} from "@chakra-ui/icons";

type AsideProdType = {
    img: string
    name: string,
    about: string,
    available: string
    distance: string
    height?: string
    product?: any
    deleteProductHandler?: (productID: number) => void
}
const AsideProducts: React.FC<AsideProdType> = ({
                                                    product,
                                                    height,
                                                    img,
                                                    name,
                                                    about,
                                                    available,
                                                    distance,
    deleteProductHandler
}) => {
    const url = useLocation().pathname;

    const navigate = useNavigate();

    const goToProduct = () => {navigate('/oneProd', {state: product})}

    const deleteHandler = () => {
        if (deleteProductHandler) {
            deleteProductHandler(product.id);
        }
    }

    return (
        <Card
            direction={{base: 'column', sm: 'row'}}
            overflow='hidden'
            variant='outline'
            mt={4}

            cursor="pointer"
            border="none"
        >

            <Image
                borderRadius="10%"
                p={2}
                objectFit='none'
                width="30%" height={150}
                src={img}
                alt={img}
                onClick={goToProduct}
            />

            <Stack onClick={goToProduct}>
                <CardBody>
                    <Heading size='sm'>{name}</Heading>
                    <Heading mb={1} noOfLines={1} size='sm'>{about}</Heading>

                    <Flex mb={1}>
                        <Heading size='sm'><Trans>Available:</Trans></Heading>
                        <Text pl='2'>
                            {available}
                        </Text>
                    </Flex>

                    <Flex>
                        <Heading size='sm'><Trans>Distance:</Trans></Heading>
                        <Text pl='2'>
                            {distance}
                        </Text>
                        <Image width={30} pl={4} src={rose} alt={rose}/>
                    </Flex>

                </CardBody>
            </Stack>

            {
                url === '/user-listings' && <>
                    <Icon as={EditIcon}/>
                    <Icon
                        ml={2}
                        as={DeleteIcon}
                        onClick={deleteHandler}
                    />
                </>
            }

        </Card>
    );
};

export default AsideProducts;