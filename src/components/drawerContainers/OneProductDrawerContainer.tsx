import {Box, IconButton, useDisclosure} from "@chakra-ui/react";
import React from "react";
import {OneProduct, UniversalDrawer} from "@/components";
import {OneProductType} from "@/components/oneProduct/OneProduct";
import {useMediaQuery} from "@/hook";
import {ArrowLeftIcon} from "@chakra-ui/icons";


export const OneProductDrawerContainer: React.FC<OneProductType> = ({
                                                                        isRoomExist,
                                                                        chat,
                                                                        product,
                                                                        buttonValue,
                                                                        sharerId,
                                                                        requesterId,
                                                                        roomId
                                                                    }) => {
    const {isOpen, onOpen, onClose} = useDisclosure();
    const isSmaller = useMediaQuery('(min-width:1200px)');
    return (
        <>
            {!isSmaller ?
                <>
                    <Box w={"98vw"} textAlign={"end"} position={"fixed"}>
                        <IconButton
                            backgroundColor='#FF2D55'
                            variant='solid'
                            colorScheme='blue'
                            onClick={onOpen}
                            width="42px"
                            icon={<ArrowLeftIcon/>}
                            aria-label={""}/>
                    </Box>
                    <UniversalDrawer
                        children={<OneProduct roomId={roomId}
                                              sharerId={sharerId}
                                              requesterId={requesterId}
                                              size={"auto"}
                                              isRoomExist={isRoomExist}
                                              chat={chat}
                                              buttonValue={buttonValue}
                                              product={product}/>}
                        onClose={onClose}
                        isOpen={isOpen} size={"md"} placement={"right"}/>
                </> :
                <OneProduct roomId={roomId}
                            sharerId={sharerId}
                            requesterId={requesterId}
                            size={"25%"}
                            isRoomExist={isRoomExist}
                            chat={chat}
                            buttonValue={buttonValue}
                            product={product}/>
            }
        </>


    )
}

