import {IconButton, useDisclosure} from "@chakra-ui/react";
import React from "react";
import {ContactsBlock, UniversalDrawer} from "@/components";

import {ContactsBlockType} from "@/components/chatComponents/ContactsBlock";
import {useMediaQuery} from "@/hook";
import {ArrowRightIcon} from "@chakra-ui/icons";


export const ContactsBlockDrawerContainer: React.FC<ContactsBlockType> = ({
                                                                              allRooms,
                                                                              roomIDFromUrl,
                                                                              newMessageRoomId
                                                                          }) => {
    const {isOpen, onOpen, onClose} = useDisclosure();
    const isSmaller = useMediaQuery('(min-width:1200px)');
    return (
        <>
            {!isSmaller ? <>
                    <IconButton
                        backgroundColor='#FF2D55'
                        variant='solid'
                        colorScheme='blue'
                        position={"fixed"} left={"-10px"}
                        onClick={onOpen}
                        width="45px"
                        icon={<ArrowRightIcon/>}
                        aria-label={""}/>
                    <UniversalDrawer
                        children={<ContactsBlock
                            allRooms={allRooms}
                            newMessageRoomId={newMessageRoomId}
                            roomIDFromUrl={roomIDFromUrl as string}
                        />}
                        onClose={onClose}
                        isOpen={isOpen} size={"md"} placement={"left"}/>
                </> :
                <ContactsBlock
                    allRooms={allRooms}
                    newMessageRoomId={newMessageRoomId}
                    roomIDFromUrl={roomIDFromUrl as string}
                />
            }
        </>
    )
}

