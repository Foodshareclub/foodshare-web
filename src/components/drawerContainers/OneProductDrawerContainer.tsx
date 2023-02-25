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
                                                                        navigateHandler
                                                                    }) => {
    const {isOpen, onOpen, onClose} = useDisclosure();
    const isSmaller = useMediaQuery('(min-width:1200px)');
    return (
        <>
            {!isSmaller ?
                <>
                    <Box w={"98vw"} textAlign={"end"} position={"fixed"}>
                        {/*<Button  backgroundColor='#FF2D55'*/}
                        {/*         width="58px" variant='solid'*/}
                        {/*         colorScheme='blue'*/}
                        {/*         onClick={onOpen}>*/}
                        {/*</Button>*/}
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
                        children={<OneProduct size={"auto"} navigateHandler={navigateHandler} isRoomExist={isRoomExist}
                                              chat={chat}
                                              buttonValue={buttonValue} product={product}/>}
                        onClose={onClose}
                        isOpen={isOpen} size={"md"} placement={"right"}/>
                </> :
                <OneProduct size={"25%"} navigateHandler={navigateHandler} isRoomExist={isRoomExist} chat={chat}
                            buttonValue={buttonValue} product={product}/>
            }
        </>


    )
}

