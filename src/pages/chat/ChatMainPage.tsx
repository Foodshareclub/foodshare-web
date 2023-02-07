import React, {useEffect} from 'react';
import {Box, Text, Flex, useDisclosure} from "@chakra-ui/react";
import {OneProduct, PopupNotificationModal} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {useParams} from "react-router-dom";
import {getOneProductTC} from "@/store/slices/productReducer";
import ContactsBlock from "@/components/chatComponents/ContactsBlock";

const ChatMainPage = () => {
    const {id} = useParams();
    const {isOpen, onOpen, onClose} = useDisclosure();
    console.log(id)

    const actions = useActionCreators({getOneProductTC})
    useEffect(() => {
        actions.getOneProductTC(Number(id));
        onOpen()
        return () => console.log("dead chat main page")
    }, [id]);
    const oneProduct = useAppSelector(state => state.product.oneProduct);
    return (
        <Flex justify={"space-between"} px={7} mt="24vh" mb={"12vh"}>
            <ContactsBlock/>
            <Box  p={7} bg={"gray.100"} borderRadius={20} w={"50%"}>

                <Flex justify={"start"} >
                    <Box bg={"white"} borderRadius={"25px"}
                          maxWidth={"100px"}>
                      <Text py={2} px={4}>Chat2</Text>
                    </Box>
                </Flex>
                <Flex justify={"end"}>
                    <Box  bg={"red.100"} borderRadius={"25px"}
                          maxWidth={"255px"}>
                      <Text px={4} py={2}> Chat2</Text>
                    </Box>
                </Flex>

            </Box>
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