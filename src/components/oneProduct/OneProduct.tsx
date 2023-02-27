import loc from "@/assets/location-blue.svg";
import likes from "@/assets/likes.svg";
import {InitialProductStateType, updateProductTC} from "@/store/slices/productReducer";
import {Box, Button, Flex, Heading, Image, Text} from "@chakra-ui/react";
import React from "react";
import {StarIcon} from "@chakra-ui/icons";
import TopTips from "@/components/topTips/TopTips";
import {Trans} from "@lingui/macro";
import {useActionCreators, useAppSelector} from "@/hook";
import {isAuthSelector, updateRoomTC, userIdFromSessionSelector} from "@/store";
import {useNavigate} from "react-router-dom";

export type OneProductType = {
    product: InitialProductStateType
    buttonValue: string
    chat?: string
    navigateHandler?: () => void
    isRoomExist?: boolean
    size?: string
    sharerId?: string
    requesterId?: string
    roomId?: string
}

export const OneProduct: React.FC<OneProductType> = ({
                                                         isRoomExist,
                                                         chat,
                                                         product,
                                                         buttonValue,
                                                         navigateHandler,
                                                         size,
                                                         sharerId,
                                                         requesterId,
                                                         roomId
                                                     }) => {
    const isAuth = useAppSelector(isAuthSelector);
    const userID = useAppSelector(userIdFromSessionSelector);

    const navigate = useNavigate();
    const actions = useActionCreators({updateProductTC, updateRoomTC})
    console.log(buttonValue)
    const onClick = async () => {

        if (navigateHandler) {
            navigateHandler()
        }
        if (buttonValue === "approval pending") {
            console.log("approval pending")
            await actions.updateProductTC({...product, post_published: false});
            await actions.updateRoomTC({post_arranged_to: requesterId, id: roomId as string});
        }
        if (buttonValue === "leave a feedBack") {
            console.log("leave a feedback")
        }
        if (buttonValue === "confirm pick up") {
            console.log("confirm pick up")
        }
    }
    if (!isAuth) {
        navigate("/")
    }
    return (
        <Box w={{md: chat ? size : "45%", base: "100%"}}>
            <Box alignSelf="center">
                <Image
                    objectFit={'cover'}
                    src={product.gif_url}
                    borderRadius={chat ? "50%" : 20}
                    alt={product.post_name}
                    m={"0 auto"}
                    width={chat ? "100px" : 300}
                    height={{ss: chat ? "100px" : "auto", base: "270px"}}
                />
            </Box>
            <Box>
                <Box lineHeight={2}>
                    <Heading textTransform={'uppercase'} pt={1}
                             textAlign={"center"} noOfLines={1} fontSize={'xl'} fontFamily={'body'}
                             fontWeight={500}>{product.post_name}</Heading>

                    <Flex>
                        <Image src={loc} alt={loc}/>
                        <Text my={0} px={1} textAlign={"center"} noOfLines={1} color={'gray.500'}
                              textTransform={'uppercase'}
                        >{product.post_address}</Text>
                    </Flex>
                    <Flex>
                        <Image src={likes} alt={likes}/>
                        <Text my={0} px={1} textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}>{product.post_like_counter}</Text>
                    </Flex>

                    <Flex justify={"center"}>
                        {Array(5)
                            .fill('')
                            .map((item, i) => (
                                <StarIcon
                                    key={i}
                                    color={i < 4 ? 'teal.500' : 'gray.300'}
                                />
                            ))}
                    </Flex>
                    <Text textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                          textTransform={'uppercase'}><Trans>{product.post_views} views</Trans></Text>
                    <Flex justify={"space-between"}>
                        <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'}
                                 alignSelf="center"><Trans>Available:</Trans></Heading>
                        <Text pl={1}
                              noOfLines={1}
                              color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}>{product.pickup_time}</Text>
                    </Flex>
                    <Flex justify={"space-between"}>
                        <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'}><Trans>Quantity:</Trans></Heading>
                        <Text pl={1} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}>{product.post_description}</Text>
                    </Flex>
                    <Flex justify={"space-between"}>
                        <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'} alignSelf="center"
                                 size='md'><Trans>Food Type:</Trans></Heading>
                        <Text color={'gray.500'} fontSize={'sm'} textTransform={'uppercase'}>{product.post_type}</Text>
                    </Flex>
                </Box>
                {chat && <TopTips/>}
                <Box mt={2}>
                    {buttonValue === "leave a feedBack" ?
                        <Button
                            isDisabled={product.post_published}
                            //_hover={{ backgroundColor:'#FF2D55'}}
                            onClick={onClick}
                            //backgroundColor='#FF2D55'
                            textTransform={"uppercase"}
                            colorScheme='red'
                            width="100%" variant='solid'>
                            {buttonValue}
                        </Button>
                        :
                        <Button
                            onClick={onClick}
                            backgroundColor='#FF2D55'
                            textTransform={"uppercase"}
                            width="100%" variant='solid'
                            colorScheme='blue'>
                            {buttonValue}
                        </Button>
                    }

                </Box>
            </Box>
        </Box>
    )
}

