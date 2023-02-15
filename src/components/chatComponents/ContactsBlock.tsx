import {useAppSelector} from "@/hook";
import {avatarURLSelector, userFirstNameSelector, userSecondNameSelector} from "@/store";
import AvatarWithRipple from "@/components/listingPersonCard/AvatarWithRipple";
import {Box, Button, Flex, Heading, Input, InputGroup, InputLeftElement} from "@chakra-ui/react";
import {SearchIcon} from "@chakra-ui/icons";
import {t} from "@lingui/macro";
import {MinifiedUserInfo} from "@/components";
import React, {Fragment} from "react";
import {useNavigate} from "react-router-dom";
import {CustomRoomType, RoomParticipantsType} from "@/pages/chat/ChatMainPage";

type ContactsBlockType = {
    room: Array<CustomRoomType>
    anotherRoomMessage: Array<RoomParticipantsType>
}

const ContactsBlock: React.FC<ContactsBlockType> = ({room, anotherRoomMessage}) => {
    const imgUrl = useAppSelector(avatarURLSelector);
    const userFirstName = useAppSelector(userFirstNameSelector);
    const userSecondName = useAppSelector(userSecondNameSelector);

    const navigate = useNavigate();

    const click = (post_id: number, sharerId: string, requesterId: string) => {
        navigate(`/chat-main/${post_id}?s=${sharerId}&r=${requesterId}`);

    }
    return (
        <Flex direction={"column"}>
            <Flex direction={"column"} alignSelf={"center"}>
                <AvatarWithRipple img={imgUrl}/>
                <Box py={2}>
                    <Heading textAlign={"center"} size='md'>
                        {userFirstName} {userSecondName}
                    </Heading>
                </Box>

                <InputGroup alignSelf="center" alignItems="center" mb={5}>
                    <InputLeftElement
                        pointerEvents={"stroke"}
                        children={<SearchIcon
                        />}
                    />
                    <Input
                        placeholder={t({
                            id: `msg.Search...`,
                            message: `Search...`
                        })}
                    />
                </InputGroup>
            </Flex>
            <Flex direction={"column"} alignSelf={"center"}>
                <Box bg={"gray.100"} borderRadius={"10%"} px={2} height={"300px"} overflow={"auto"}>
                    {room && room.map((data: any) => {
                            return <Fragment key={data.id}>
                                <MinifiedUserInfo
                                    src={data.posts.gif_url}
                                    description={data.posts.post_name}
                                    firstName={'fNAME'}
                                    secondName={'sName'}
                                />
                                <Button
                                    onClick={() => click(data.posts.id, data.sharer, data.requester)}
                                    color={anotherRoomMessage.map(room => room.room_id === data.id ? "red" : "")
                                    // anotherRoomMessage?.room_id === data.id ? "red" : ""
                                }
                                    bg={"gray.400"}
                                    variant={"outline"}
                                >
                                    Tap
                                </Button>
                            </Fragment>
                        }
                    )}

                </Box>

            </Flex>
        </Flex>
    )
}
export default ContactsBlock;