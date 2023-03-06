import {Box, IconButton, useDisclosure} from "@chakra-ui/react";
import React from "react";
import {OneProduct, UniversalDrawer} from "@/components";
import {OneProductType} from "@/components/oneProduct/OneProduct";
import {useMediaQuery} from "@/hook";
import {ArrowLeftIcon} from "@chakra-ui/icons";


export const OneProductDrawerContainer: React.FC<OneProductType> = ({
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
                    <Box
                        w={"100vw"}
                        textAlign={"end"} position={"fixed"}>
                        <IconButton
                            backgroundColor='#FF2D55'
                            variant='solid'
                            right={17}
                            colorScheme='blue'
                            onClick={onOpen}
                            width="45px"
                            icon={<ArrowLeftIcon/>}
                            aria-label={""}/>
                    </Box>
                    <UniversalDrawer
                        onClose={onClose}
                        isOpen={isOpen}
                        size={"md"}
                        placement={"right"}
                        children={
                            <OneProduct roomId={roomId}
                                        sharerId={sharerId}
                                        requesterId={requesterId}
                                        size={"auto"}
                                        chat={chat}
                                        buttonValue={buttonValue}
                                        product={product}/>
                        }
                    />
                </> :
                <OneProduct roomId={roomId}
                            sharerId={sharerId}
                            requesterId={requesterId}
                            size={"24vw"}
                            chat={chat}
                            buttonValue={buttonValue}
                            product={product}/>
            }
        </>


    )
}

