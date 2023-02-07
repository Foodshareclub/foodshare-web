import React, {useEffect} from 'react';
import {Box, Flex, useDisclosure} from "@chakra-ui/react";
import {OneProduct, PopupNotificationModal} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {useParams} from "react-router-dom";
import {getOneProductTC} from "@/store/slices/productReducer";

const ChatMainPage = () => {
    const {id} = useParams();
    const {isOpen, onOpen, onClose} = useDisclosure();
    console.log(id)

    const actions = useActionCreators({getOneProductTC})
    useEffect(() => {
        actions.getOneProductTC(Number(id));
         onOpen()
        return ()=>console.log("dead chat main page")
    }, [id]);
    const oneProduct = useAppSelector(state => state.product.oneProduct);
    return (
        <Flex justify={"space-between"}  px={7} mt="24vh" mb={"12vh"}>
            <Box bg={"blue.100"} w={"25%"}>Mask</Box>
            <Box bg={"blue.400"} w={"50%"}>Chat</Box>
            {
                oneProduct?.map((product, id) => {
                    return <OneProduct chat="chat"
                        product={product}
                        buttonValue={"approval pending"}
                        key={id}
                    />
                })}
            <PopupNotificationModal isOpen={isOpen} onClose={onClose}/>
        </Flex>
    );
};

export default ChatMainPage;