import {InitialProductStateType} from "@/store/slices/productReducer";
import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Box, Flex, GridItem, Image, Skeleton} from "@chakra-ui/react";
import {navigatePhotosObject} from "@/utils";
import {Trans} from "@lingui/macro";
import navIcon from "@/assets/map.svg";

type ProductCardType = {
    product: InitialProductStateType
}

export const ProductCard: React.FC<ProductCardType> = ({product}) => {
    const navigate = useNavigate();

    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const time = setTimeout(() => {// пока фото загрузятся skeleton
            setIsLoaded(true)
        }, 1000)

        return () => clearTimeout(time);
    }, []);

    const onNavigateToOneProductHandler = () => navigate(`/one-product/${product.post_type}/${product.id}`);

    return(
        <GridItem mt='2' mb='2'>

            <Skeleton isLoaded={isLoaded}>

                <Image
                    rounded={'lg'}
                    objectFit={'cover'}
                    width="100%"
                    height={250}
                    cursor="pointer"
                    borderRadius="10px"
                    onClick={onNavigateToOneProductHandler}
                    src={product.gif_url}
                    alt="broken image"
                />
            </Skeleton>
            {!isLoaded
                ? <div>
                    <Skeleton mt={4} height='20px' isLoaded={isLoaded}/>
                    <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                    <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                    <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                </div>
                :
                <Box mt={3}>
                    <Flex justify="space-between" alignItems="center" alignSelf="center" fontSize={25}>
                        <Box noOfLines={1} fontWeight={700}>
                            {product.post_name}
                        </Box>
                        <Image
                            borderRadius='full'
                            src={navigatePhotosObject[product.post_type]}
                            alt={navigatePhotosObject[product.post_type]}
                        />
                    </Flex>
                    <Flex justify="space-between" alignItems="center" alignSelf="center">
                        <div style={{fontWeight: "700", fontSize: "16px"}}><Trans>Distance:</Trans></div>
                        <Box mt='1' ml="2" fontWeight='normal' as='h4' lineHeight='tight' noOfLines={1}
                        >
                            {product.post_address}
                        </Box>
                        <Image borderRadius='full' src={navIcon} alt={navIcon}
                        />
                    </Flex>
                    <Box display='flex' alignItems='baseline'>
                        <div style={{fontWeight: "700", fontSize: "16px"}}><Trans>Available:</Trans></div>
                        <Box mt='1' ml="2" fontWeight='normal' as='h4' lineHeight='tight' noOfLines={1}
                        >
                            {product.pickup_time}
                        </Box>
                    </Box>

                    <Box display='flex' alignItems='baseline'>
                        <div style={{fontWeight: "700", fontSize: "16px"}}><Trans>About:</Trans></div>
                        <Box ml={2} mt='1' fontWeight='normal' as='h4' lineHeight='tight' noOfLines={1}
                        >
                            {product.post_description}
                        </Box>
                    </Box>
                </Box>
            }
        </GridItem>
    )
}