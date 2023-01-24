import React from 'react';
import {Card, CardBody, CardFooter, Heading, IconButton, Image, Text} from "@chakra-ui/react";
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
            direction={{base: 'column', lg: 'row'}}
            overflow='hidden'
            variant='outline'
            mt={4}
            mx={2}
            cursor="pointer"
            border="1px solid teal.50"
        >

            <Image
                rounded={'md'}
                objectFit={'cover'}
                borderRadius="5%"
                p={2}
                height={150}
                src={img}
                alt="profile img"
                onClick={goToProduct}
            />


            <CardBody alignSelf={"center"} onClick={goToProduct}>
                <Heading textAlign={"center"} noOfLines={1} fontSize={'2xl'} fontFamily={'body'}
                         fontWeight={500}>{name}</Heading>
                <Text textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                      textTransform={'uppercase'}>{about}</Text>

                {/*<Flex mb={1}>*/}
                {/*    <Heading size='sm'><Trans>Available:</Trans></Heading>*/}
                {/*    <Text pl='2'>*/}
                {/*        {available}*/}
                {/*    </Text>*/}
                {/*</Flex>*/}

                {/*<Flex>*/}
                {/*    <Heading size='sm'><Trans>Distance:</Trans></Heading>*/}
                {/*    <Text pl='2'>*/}
                {/*        {distance}*/}
                {/*    </Text>*/}
                {/*    <Image width={30} pl={4} src={rose} alt={rose}/>*/}
                {/*</Flex>*/}
            </CardBody>
            {
                url === '/user-listings' && <CardFooter alignSelf={"center"}>
                    {/*<Flex alignSelf={"center"} m={"0 auto"} justify={"space-around"} w="30%">*/}
                    <PublishListingModal
                        userID={product.user}
                        product={product}/>
                    <IconButton
                        ml={4}
                        onClick={deleteHandler}
                        variant='outline'
                        icon={<DeleteIcon/>}
                        aria-label="delete">
                        <Trans>Delete</Trans>
                    </IconButton>
                    {/*</Flex>*/}
                </CardFooter>

            }
        </Card>
    );
};

export default AsideProducts;