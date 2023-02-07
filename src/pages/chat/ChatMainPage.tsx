import React, {useEffect, useState} from 'react';
import {Box, Button, Flex, Input, Text, useDisclosure} from "@chakra-ui/react";
import {OneProduct, PopupNotificationModal} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {useParams} from "react-router-dom";
import {getOneProductTC} from "@/store/slices/productReducer";
import ContactsBlock from "@/components/chatComponents/ContactsBlock";
import {AddIcon} from "@chakra-ui/icons";
import {supabase} from "@/supaBase.config";

type MessagesType = {
    id: string
    created_at: Date
    content: string
    user_id: string
}


const ChatMainPage = () => {
    const {id} = useParams();
    const {isOpen, onOpen, onClose} = useDisclosure();
    const actions = useActionCreators({getOneProductTC})
    const oneProduct = useAppSelector(state => state.product.oneProduct);

    useEffect(() => {
        actions.getOneProductTC(Number(id));
        onOpen()
        return () => {
            console.log("dead chat main page")
        }
    }, [id]);

//////////////////////////////////////////////////////////////////
    const [messages, setMessages] = useState<any>()
    useEffect(() => {
        supabase.from("messages").select().then(res => setMessages(res.data))
    }, [])

    console.log(messages, "from table")

    useEffect(() => {
        const channel = supabase
            .channel("*")
            .on(
                "postgres_changes",
                {event: "INSERT", schema: "public", table: "messages"},
                (payload: { new: MessagesType; }) => {
                    const newMessage = payload.new as MessagesType;

                    if (!messages.find((message: { id: string; }) => message.id === newMessage.id)) {
                        setMessages([...messages, newMessage]);
                    }
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel).then(res => console.log(res));
        };
    }, [supabase, messages, setMessages]);

    const [val, setVal] = useState('');
    supabase
        .channel("a4803e99-0fb6-4592-9e54-943d1fb644b0",).subscribe()
        .on('broadcast', {event: 'supa'}, payload => {
            console.log(payload.payload, "from webSocket")
        })
    const sendObj = {
        post_id: 2,
        content: val,
        user_id_addressee: "a4803e99-0fb6-4592-9e54-943d1fb644b0"
    }
    const click = async () => {
        await supabase.from("messages").insert(sendObj)
        //мой id
        supabase.channel('fe1be510-f308-44c1-b1bb-8050e1c2cf31').subscribe((status) => console.log(status)).send({
            type: 'broadcast',
            event: 'supa',
            payload: {org: val},
        }).then((res) => console.log(res))
    }
    /////////////////////////////////////////////
    return (
        <Flex justify={"space-between"} px={7} mt="24vh" mb={"12vh"}>
            <ContactsBlock/>
            <Flex justify={"space-between"} direction={"column"} p={3} bg={"gray.200"} borderRadius={20} w={"50%"}>
                <Box p={3} borderRadius={20} bg={"gray.100"} h={"92%"}>
                    <Flex justify={"start"}>
                        <Box bg={"white"} borderRadius={"25px"}
                             maxWidth={"100px"}>
                            <Text py={2} px={4}>Chat1</Text>
                        </Box>
                    </Flex>
                    <Flex justify={"end"}>
                        <Box bg={"red.100"} borderRadius={"25px"}
                             maxWidth={"255px"}>
                            <Text px={4} py={2}> Chat2</Text>
                        </Box>
                    </Flex>

                </Box>
                <Flex borderRadius={20} h={"6%"} bg={"gray.200"}>
                    <Input _hover={{bg: "white"}} variant={"filled"} borderRadius={20}
                           type={'text'}
                           placeholder='Enter...'
                           value={val} onChange={(e) => setVal(e.currentTarget.value)}
                           mr={2}
                    />
                    <Button onClick={click} as={AddIcon} borderRadius={20} colorScheme={"green"} p={2}
                            backgroundColor='#FF2D55' color={"white"} variant={"solid"}>
                    </Button>
                </Flex>

            </Flex>
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