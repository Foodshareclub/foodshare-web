import React, {useEffect} from 'react';
import App from "@/App";
import {useActionCreators} from "@/hook";
import {listenChannelTC} from "@/store/slices/chatReducer";

const ContainerForChat = () => {
    const actions =useActionCreators({listenChannelTC})

    useEffect(() => {
        actions.listenChannelTC();
    }, [])
    return (
        <App/>
    );
};

export default ContainerForChat;