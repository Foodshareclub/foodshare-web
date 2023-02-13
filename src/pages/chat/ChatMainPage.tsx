import React, {useEffect, useRef, useState} from 'react';
import {Box, Button, Flex, Input, Text, useDisclosure} from "@chakra-ui/react";
import {OneProduct, PopupNotificationModal} from "@/components";
import {useActionCreators, useAppSelector} from "@/hook";
import {useParams} from "react-router-dom";
import {getOneProductTC} from "@/store/slices/productReducer";
import ContactsBlock from "@/components/chatComponents/ContactsBlock";
import {AddIcon} from "@chakra-ui/icons";
import {supabase} from "@/supaBase.config";
import {userIdFromSessionSelector} from "@/store";

type MessagesType = {
    id: string
    created_at: Date
    content: string
    user_id: string
    user_id_addressee: string
}


const ChatMainPage = () => {
    const {id} = useParams();
    const {isOpen, onOpen, onClose} = useDisclosure();
    const actions = useActionCreators({getOneProductTC})
    const oneProduct = useAppSelector(state => state.product.oneProduct);
    const userID = useAppSelector(userIdFromSessionSelector);

    useEffect(() => {
        actions.getOneProductTC(Number(id));
        onOpen()
        return () => {
            console.log("dead chat main page")
        }
    }, [id]);

//////////////////////////////////////////////////////////////////
    const [messages, setMessages] = useState<any>()
    // useEffect(() => {
    //     supabase
    //         .from("rooms")
    //         .select()
    //         .then(res => setMessages(res.data))
    // }, [])
    // console.log(messages, "from table")

    useEffect(() => {
        const channel = supabase
            .channel("*")
            .on(
                "postgres_changes",
                {event: "INSERT", schema: "public", table: "rooms"},
                (payload: { new: MessagesType; }) => {

                    const newMessage = payload.new as MessagesType;

                    if (!messages.find((message: { id: string; }) => message.id === newMessage.id)) {
                        if ('roomID' === messages.room_id ) {
                            setMessages([...messages, newMessage]);
                        }
                    }
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel).then(res => console.log(res));
        };
    }, [supabase, messages, setMessages]);

    const [val, setVal] = useState('');

    const click = async () => {
        await supabase.from("rooms").insert('');

        setVal('');
    }

    useEffect(() => {
        messagesAnchorRef.current?.scrollIntoView({behavior: 'smooth'}); //scroll down to show last message
    }, [messages]);

    const messagesAnchorRef = useRef<HTMLDivElement>(null);

    return (
        <Flex justify={"space-between"} px={7} mt="24vh" mb={"12vh"}>
            <ContactsBlock/>
            <Flex justify={"space-between"} direction={"column"} p={3} bg={"gray.200"} borderRadius={20} w={"50%"} height={'500px'}>
                <Box p={3} borderRadius={20} bg={"gray.100"} h={"90%"} overflow={"auto"}>
                    {messages && messages.map((m: any) => {
                        let time = new Date(m.created_at).toLocaleTimeString()
                        return userID === m.user_id
                            ? <Flex justify={"end"} key={m.id}>
                                <Text color={"gray.400"}>
                                    {time}
                                </Text>
                                <Box my={2} bg={"red.100"} borderRadius={"25px"} maxWidth={"255px"}>
                                    <Text px={4} py={2}>
                                        {m.text}
                                    </Text>
                                </Box>
                            </Flex>

                            : <Flex justify={"start"} key={m.id}>
                                <Box my={2} bg={"white"} borderRadius={"25px"} maxWidth={"255px"}>
                                    <Text py={2} px={4}>
                                        {m.text}
                                    </Text>
                                </Box>
                                <Text color={"gray.400"}>
                                    {time}
                                </Text>
                            </Flex>
                    })}
                    <Box ref={messagesAnchorRef}></Box>
                </Box>
                <Flex borderRadius={20} h={"7%"} bg={"gray.200"}>
                    <Input
                        _hover={{bg: "white"}}
                        variant={"filled"}
                        borderRadius={20}
                        type={'text'}
                        placeholder='Enter...'
                        value={val}
                        onChange={(e) => setVal(e.currentTarget.value)}
                        mr={2}
                    />
                    <Button
                        onClick={click}
                        as={AddIcon}
                        borderRadius={20}
                        colorScheme={"green"}
                        p={2}
                        backgroundColor='#FF2D55'
                        color={"white"}
                        variant={"solid"}>
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