import {InitialProductStateType} from "@/store/slices/productReducer";
import React, {useEffect, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {Box, Flex, GridItem, Heading, IconButton, Image, Skeleton, Text} from "@chakra-ui/react";
import {navigatePhotosObject} from "@/utils";
import {Trans} from "@lingui/macro";
import navIcon from "@/assets/map.svg";
import PublishListingModal from "../modals/PublishListingModal";
import {DeleteIcon} from "@chakra-ui/icons";

type ProductCardType = {
    product: InitialProductStateType
    deleteProductHandler?: (productID: number) => void
}

export const ProductCard: React.FC<ProductCardType> = ({product, deleteProductHandler}) => {
    const navigate = useNavigate();
    const url = useLocation().pathname;
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const time = setTimeout(() => {// пока фото загрузятся skeleton
            setIsLoaded(true)
        }, 1000)

        return () => clearTimeout(time);
    }, []);
    const goToProduct = () => {
        navigate('/oneProd', {state: product})
    }

    const deleteHandler = () => {
        if (deleteProductHandler) {
            deleteProductHandler(product.id);
        }
    }
    return (
        <GridItem >

            <Skeleton isLoaded={isLoaded}>

                <Image
                    rounded={'lg'}
                    objectFit={'cover'}
                    width="100%"
                    height={250}
                    cursor="pointer"
                    borderRadius="10px"
                    onClick={() => navigate(`/one-product`, {state: product})} src={product.gif_url}
                    alt="broken image"
                />
            </Skeleton>
            {!isLoaded
                ? <Box>
                    <Skeleton mt={4} height='20px' isLoaded={isLoaded}/>
                    <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                    <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                    <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                </Box>
                :
                <Box mt={3}>
                    {
                        url === '/user-listings' && <Flex justify={"center"}>
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
                        </Flex>

                    }
                    <Flex justify="space-between" align="center"  fontSize={25}>
                        <Heading noOfLines={1} fontSize={'xl'} fontFamily={'body'}
                                 fontWeight={500}>
                            {product.post_name.toUpperCase()}
                        </Heading>
                        <Image
                            borderRadius='full'
                            src={navigatePhotosObject[product.post_type]}
                            alt={"img"}
                        />
                    </Flex>
                    <Flex pt={3} justify="space-between" alignItems="center" alignSelf="center">
                        <Text mt='1' color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}><Trans>Distance:</Trans></Text>
                        <Text mt='1' ml="2" noOfLines={1} color={'black'} fontSize={'sm'} textTransform={'uppercase'}>
                            {product.post_address}
                        </Text>
                        <Image borderRadius='full' src={navIcon} alt={navIcon}
                        />
                    </Flex>
                    <Flex >
                        <Text mt='1' color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}><Trans>Available:</Trans></Text>
                        <Text mt='1' ml="2" noOfLines={1} color={'black'} fontSize={'sm'} textTransform={'uppercase'}>
                            {product.pickup_time}
                        </Text>
                    </Flex>

                    <Flex>
                        <Text mt='1' color={'gray.500'} fontSize={'sm'}
                             textTransform={'uppercase'}><Trans>About:</Trans></Text>
                        <Text mt='1' ml="2" noOfLines={1} color={'black'} fontSize={'sm'} textTransform={'uppercase'}
                        >
                            {product.post_description}
                        </Text>
                    </Flex>
                </Box>
            }
        </GridItem>
    )
}