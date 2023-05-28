import loc from "@/assets/location-blue.svg";
import likes from "@/assets/likes.svg";
import bus from "@/assets/busIcon.png";
import {updateProductTC} from "@/store/slices/productReducer";
import {Box, Button, Flex, Heading, Image, Text, useDisclosure} from "@chakra-ui/react";
import React, {useState} from "react";
import {StarIcon} from "@chakra-ui/icons";
import TopTips from "@/components/topTips/TopTips";
import {Trans} from "@lingui/macro";
import {useActionCreators, useAppSelector} from "@/hook";
import {isAuthSelector, loginTC, updateRoomTC} from "@/store";
import {AuthenticationUserModal, PopupNotificationModal} from "@/components";
import {InitialProductStateType} from "@/api/productAPI";

export type OneProductType = {
    product: InitialProductStateType
    buttonValue: string
    chat?: string
    navigateHandler?: () => void
    size?: string
    sharerId?: string
    requesterId?: string
    roomId?: string
}

export const OneProduct: React.FC<OneProductType> = ({
                                                         chat,
                                                         product,
                                                         buttonValue,
                                                         navigateHandler,
                                                         size,
                                                         requesterId,
                                                         roomId
                                                     }) => {
    const [value, setValue] = useState(0)
    const {isOpen, onOpen, onClose} = useDisclosure();
    const isAuth = useAppSelector(isAuthSelector);
    const actions = useActionCreators({updateProductTC, updateRoomTC})

    const onClick = async () => {
        if (buttonValue === "completed") {
            return;
        }
        if (navigateHandler) {
            navigateHandler();
        }
        if (buttonValue === "approval pending") {
            await actions.updateProductTC({gif_url: product.gif_url, id: product.id, post_published: false});
            await actions.updateRoomTC({post_arranged_to: requesterId, id: roomId as string});
        }
        if (buttonValue === "leave a feedBack") {
            onOpen();
        }

    }
    return (
        <Flex py={3}
              direction={"column"}
              justify={"space-around"}
              w={{md: chat ? size : "45%", base: "100%"}}
        >
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
                <Box
                >
                    <Heading pt={1}
                             textAlign={"center"} noOfLines={1} fontSize={'xl'} fontFamily={'body'}
                             fontWeight={500}>{product.post_name}</Heading>

                    <Flex justify={"space-between"}>
                        <Image src={loc} alt={loc}/>
                        <Text my={0} px={1} textAlign={"center"} noOfLines={1} color={'gray.500'}

                        >{product.post_address}</Text>
                    </Flex>
                    <Flex>
                        <Image src={likes} alt={likes}/>
                        <Text my={0} px={1} textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                        >{product.post_like_counter}</Text>
                    </Flex>

                    <Flex justify={"center"}>
                        {Array(5)
                            .fill('')
                            .map((item, i) => (
                                <StarIcon onClick={() => setValue(i + 1)}
                                          key={i}
                                          color={i < value ? 'teal.500' : 'gray.300'}
                                />
                            ))}
                    </Flex>
                    <Text textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}>
                        <Trans>{product.post_views} views</Trans></Text>
                    <Flex justify={"space-between"}>
                        <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'}
                                 alignSelf="center"><Trans>Available:</Trans></Heading>
                        <Text pl={1}
                              noOfLines={1}
                              color={'gray.500'} fontSize={'sm'}
                        >{product.pickup_time}</Text>
                    </Flex>
                    <Flex justify={"space-between"}>
                        <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'}><Trans>Quantity:</Trans></Heading>
                        <Text pl={1} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                        >{product.post_description}</Text>
                    </Flex>
                    <Flex justify={"space-between"}>
                        <Image mt={1} width={4} src={bus} alt={'bus'}/>
                        <Text color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}>{product.post_metro_station}</Text>
                    </Flex>
                </Box>
                {chat && <TopTips/>}
                <PopupNotificationModal isOpen={isOpen} onClose={onClose}/>
                <Box mt={2}>

                    {!isAuth ? <AuthenticationUserModal oneProductComponent buttonValue="Login" thunk={loginTC}/> :
                        buttonValue === "leave a feedBack" ?
                            <Button
                                isDisabled={product.post_published}
                                onClick={onClick}
                                textTransform={"uppercase"}
                                colorScheme='red'
                                width="100%" variant='solid'>
                                {buttonValue}
                            </Button>
                            :
                            <Button
                                onClick={onClick}
                                backgroundColor={buttonValue === "completed" ? "green.300" : '#FF2D55'}
                                textTransform={"uppercase"}
                                width="100%" variant='solid'
                                cursor={buttonValue === "completed" ? "default" : "pointer"}
                                colorScheme={buttonValue === "completed" ? "green.300" : 'blue'}
                            >
                                {buttonValue}
                            </Button>
                    }

                </Box>
            </Box>
        </Flex>
    )
}

