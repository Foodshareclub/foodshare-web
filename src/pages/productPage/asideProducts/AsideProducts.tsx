import React from 'react';
import {Card, CardBody, Flex, Heading, IconButton, Image, Stack, Text} from "@chakra-ui/react";
import rose from "../../../assets/map.svg";
import {useLocation, useNavigate} from "react-router-dom";
import {Trans} from "@lingui/macro";
import {DeleteIcon} from "@chakra-ui/icons";
import PublishListingModal from "../../../components/modals/PublishListingModal";

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
                                                    img,
                                                    name,
                                                    about,
                                                    available,
                                                    distance,

                                                    deleteProductHandler
                                                }) => {
    const url = useLocation().pathname;

    const navigate = useNavigate();

    const goToProduct = () => {
        navigate('/oneProd', {state: product})
    }

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
            border="1px solid teal.50"
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

            <Stack
                onClick={goToProduct}
            >
                <CardBody>
                    <Heading size='md'>{name}</Heading>
                    <Text my={1} noOfLines={1} size='sm'>{about}</Text>

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
                url === '/user-listings' && <Flex alignSelf={"center"} m={"0 auto"} justify={"space-around"} w="30%">
                    <PublishListingModal
                        userID={product.user}
                        product={product}/>
                    <IconButton onClick={deleteHandler}
                                variant='outline'
                                icon={<DeleteIcon/>}
                                aria-label="delete">
                        <Trans>Delete</Trans>
                    </IconButton>
                </Flex>
            }
        </Card>
    );
};

export default AsideProducts;