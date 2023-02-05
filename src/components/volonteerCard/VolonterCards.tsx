import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Box, Flex, GridItem, Heading, IconButton, Image, Skeleton, Text} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";
import navIcon from "@/assets/map.svg";
import {AllValuesType} from "@/api/profileAPI";
import {StarIcon} from "@chakra-ui/icons";
import {ReactComponent as HeartGray} from "@/assets/likesGray.svg";

type ProductCardType = {
    volunteer: AllValuesType
}

export const VolunteerCards: React.FC<ProductCardType> = React.memo(({volunteer}) => {
    const navigate = useNavigate();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const time = setTimeout(() => {// пока фото загрузятся skeleton
            setIsLoaded(true)
        }, 1000)

        return () => clearTimeout(time);
    }, []);
    const id = volunteer.id
    const onNavigateToOneProductHandler = () => navigate(`${id}`);

    return (
        <GridItem>
            <Skeleton isLoaded={isLoaded}>
                <Box textAlign={"center"} zIndex={1} position={"absolute"}>
                    <IconButton ml={10} cursor={"pointer"} borderRadius={"50%"}
                                size={"xs"} icon={<HeartGray fill={"red"}/>} aria-label={"volunteer"}/>
                </Box>
                <Image
                    m={"0 auto"}
                    sizes={"full"}
                    position={"relative"}
                    borderRadius='full'
                    boxSize={{sm: '250px', base: "200px"}}
                    objectFit={'cover'}
                    cursor="pointer"
                    onClick={onNavigateToOneProductHandler}
                    src={volunteer.avatar_url}
                    alt="broken image"
                />

            </Skeleton>
            {!isLoaded
                ? <Box>
                    <Skeleton border={"none"} mt={4} height='20px' isLoaded={isLoaded}/>
                    <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                    <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                    <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                </Box>
                :
                <Box mt={3}>
                    <Flex justify="space-between" align="center" fontSize={25}>
                        <Heading noOfLines={1} fontSize={'xl'} fontFamily={'body'}
                                 fontWeight={500}>
                            {volunteer.first_name.toUpperCase()}
                        </Heading>
                        <StarIcon color={"black"}/>
                    </Flex>
                    <Flex pt={3} justify="space-between" alignItems="center" alignSelf="center">
                        <Text mt='1' color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}><Trans>{volunteer.user_address}</Trans></Text>
                        <Image cursor={"pointer"} borderRadius='full' src={navIcon} alt={navIcon}
                        />
                    </Flex>


                </Box>
            }
        </GridItem>
    )
})