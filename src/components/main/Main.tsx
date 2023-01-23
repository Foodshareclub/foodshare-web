import React, {useEffect, useState} from 'react';
import {useNavigate} from "react-router-dom";
import {Box, Flex, GridItem, Image, Link, SimpleGrid, Skeleton} from "@chakra-ui/react";
import navIcon from '../../assets/map.svg';
import soup from '../../assets/soup.svg';
import {ArrowForwardIcon} from "@chakra-ui/icons";
import useMediaQuery from '../../utils/useMediaQuery';
import {getProductTC, InitialProductStateType} from "../../store/slices/productReducer";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {navigatePhotosObject} from "../../utils/navigatePhotosObject";
import {Trans} from "@lingui/macro";

type MainType = {
    productType: string
}

export const Main: React.FC<MainType> = ({productType}) => {
    const dispatch = useAppDispatch();


    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const time = setTimeout(() => {// пока фото загрузятся skeleton
            setIsLoaded(true)
        }, 1000)

        return () => clearTimeout(time);
    }, []);

    useEffect(() => {
        if (productType && productType !== '/') {
            dispatch(getProductTC(productType));
        }
    }, [productType]);

    const products = useAppSelector<Array<InitialProductStateType>>(state => state.product.products);

    const isSmallerThan500 = useMediaQuery('(min-width:500px)');
    const isSmallerThan700 = useMediaQuery('(min-width:700px)');
    const isSmallerThan1290 = useMediaQuery('(min-width:1290px)');
    const navigate = useNavigate();
    const gridSize = () => {
        if (isSmallerThan1290) {
            return 5;
        }
        if (isSmallerThan700) {
            return 4;
        }
        if (isSmallerThan500) {
            return 2;
        }
    };

    return (
        <Box mt="22vh">
            {/*<Trans>*/}
            {/*    Last login on {i18n.date(new Date())}.*/}
            {/*</Trans>*/}
            <SimpleGrid columns={gridSize()}
                        spacing={10}>
                {products.map((item, id) => (
                    <GridItem mt='2' mb='2' key={id}>

                        <Skeleton isLoaded={isLoaded}>

                            <Image width="100%" height={250} cursor="pointer" borderRadius="10px"
                                   onClick={() => navigate(`/oneProd`, {state: item})} src={item.gif_url}
                                   alt="soup"/>
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
                                        {item.post_name}
                                    </Box>
                                    <Image
                                        borderRadius='full'
                                        src={navigatePhotosObject[item.post_type]}
                                        alt={soup}
                                    />
                                </Flex>
                                <Flex justify="space-between" alignItems="center" alignSelf="center">
                                    <div style={{fontWeight: "700", fontSize: "16px"}}><Trans>Distance:</Trans></div>
                                    <Box mt='1' ml="2" fontWeight='normal' as='h4' lineHeight='tight' noOfLines={1}
                                    >
                                        {item.post_address}
                                    </Box>
                                    <Image borderRadius='full' src={navIcon} alt={navIcon}
                                    />
                                </Flex>
                                <Box display='flex' alignItems='baseline'>
                                    <div style={{fontWeight: "700", fontSize: "16px"}}><Trans>Available:</Trans></div>
                                    <Box mt='1' ml="2" fontWeight='normal' as='h4' lineHeight='tight' noOfLines={1}
                                    >
                                        {item.pickup_time}
                                    </Box>
                                </Box>

                                <Box display='flex' alignItems='baseline'>
                                    <div style={{fontWeight: "700", fontSize: "16px"}}><Trans>About:</Trans></div>
                                    <Box ml={2} mt='1' fontWeight='normal' as='h4' lineHeight='tight' noOfLines={1}
                                    >
                                        {item.post_description}
                                    </Box>
                                </Box>
                            </Box>
                        }
                    </GridItem>
                ))}

            </SimpleGrid>
            <Box _hover={{bg: 'red.100'}} fontSize={25} textAlign="center" mt={5}>
                <Link href='#'>
                    <Trans>See more...</Trans><ArrowForwardIcon mx={2}/>
                </Link>
            </Box>
        </Box>
    );
}