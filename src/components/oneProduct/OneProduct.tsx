import loc from "@/assets/location-blue.svg";
import likes from "@/assets/likes.svg";
import {InitialProductStateType} from "@/store/slices/productReducer";
import {Box, Button, Flex, Heading, Image, Text} from "@chakra-ui/react";
import React, {useEffect, useState} from "react";
import {StarIcon} from "@chakra-ui/icons";
import TopTips from "@/components/topTips/TopTips";
import {Trans} from "@lingui/macro";
import {useNavigate} from "react-router-dom";
import {useAppSelector} from "@/hook";
import {userIdFromSessionSelector} from "@/store";
import {supabase} from "@/supaBase.config";

type OneProductType = {
    product: InitialProductStateType
    buttonValue?: string
    chat?: string
}

type RoomType = {
    requester: string
    sharer: string
    post_id: number
    last_message: string
    last_message_sent_by: string
}

export const OneProduct: React.FC<OneProductType> = ({chat, product, buttonValue = "Request"}) => {
    const userID = useAppSelector(userIdFromSessionSelector);

    const [isRoomExist, setIsRoomExist] = useState<boolean>();

    useEffect(() => {  //to find out if a room exists or not
        (async () => {
            const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .match({requester: userID, post_id: product.id});
            setIsRoomExist(!!data?.length)
            // console.log(data)
        })()
    }, []);

    const navigate = useNavigate();

    const navigateHandler = () => {
        navigate(`/chat-main/${product.id}`);

        if (isRoomExist) { //forbidden to creat a new room if it already exists
            return;
        }
        onCreateRoomHandler();
    }

    const onCreateRoomHandler = async () => {
        const room = {
            requester: userID,
            sharer: product.user,
            post_id: product.id,
            last_message_sent_by: userID,
            last_message: 'Initial message'
        } as RoomType;

        await supabase.from("rooms").insert(room);
    }
    return (
        <Box w={{md: chat?"25%":"45%", base: "100%"}}>
            <Box alignSelf="center">
                <Image
                    src={product.gif_url}
                    borderRadius={chat ? "50%" : 20}
                    alt={product.post_name}
                    m={"0 auto"}
                    width={chat ? "100px" : 300}
                    height={{ss:chat?"100px":"auto", base: "270px"}}
                />
            </Box>
            <Box>
                <Box lineHeight={2}>
                    <Heading textTransform={'uppercase'} pt={1}
                             textAlign={"center"} noOfLines={1} fontSize={'xl'} fontFamily={'body'}
                             fontWeight={500}>{product.post_name}</Heading>

                    <Flex >
                        <Image src={loc} alt={loc}/>
                        <Text px={2} textAlign={"center"} noOfLines={1} color={'gray.500'}
                              textTransform={'uppercase'}
                        >{product.post_address}</Text>
                    </Flex>
                    <Flex>
                        <Image src={likes} alt={likes}/>
                        <Text px={2} textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}
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
                    <Button
                        onClick={navigateHandler}
                        backgroundColor='#FF2D55'
                        textTransform={"uppercase"}
                        width="100%" variant='solid'
                        colorScheme='blue'>
                        {buttonValue}     {/*change button name if room exist*/}
                    </Button>

                </Box>
            </Box>
        </Box>
    )
}