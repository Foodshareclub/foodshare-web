import React, {useEffect, useState} from 'react';
import {Alert, AlertIcon, AlertTitle} from "@chakra-ui/react";
import {useActionCreators} from "@/hook";
import {userActions} from "@/store/slices/userReducer";
import {productActions} from "@/store/slices/productReducer";

export type StatusType = "info" | "warning" | "success" | "error" | "loading" | undefined
type PropsType ={
    status:StatusType
    title:string
    top:string
}
const AlertComponent:React.FC<PropsType> = ({status,title,top}) => {
    const [isLoaded, setIsLoaded] = useState(false);
const actions = useActionCreators({...userActions,...productActions})
    useEffect(() => {
        const time = setTimeout(() => {
            setIsLoaded(true)
            actions.isUpdateProfile("info")
            actions.isUpdateProduct("info")
        }, 3000)

        return () => clearTimeout(time);
    }, [status]);

    if(status === "success") {
        return (<>
                {isLoaded && <Alert zIndex={10}  position={"fixed"} status={"success"} left={0} top={top}>
                    <AlertIcon />
                    <AlertTitle>{title}</AlertTitle>
                    {/*<AlertDescription>Your Chakra experience may be degraded.</AlertDescription>*/}
                </Alert> }</>

        );
    }
    if(status === "error") {
        return (<>
                {isLoaded && <Alert zIndex={10}  position={"fixed"} status={"error"} left={0} top={top}>
                    <AlertIcon />
                    <AlertTitle>{title}</AlertTitle>
                    {/*<AlertDescription>Your Chakra experience may be degraded.</AlertDescription>*/}
                </Alert> }</>

        );
    }
    return <></>

};

export default AlertComponent;