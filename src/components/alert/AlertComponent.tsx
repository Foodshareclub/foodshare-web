import React, {useEffect, useState} from 'react';
import {Alert, AlertDescription, AlertIcon, AlertTitle} from "@chakra-ui/react";
import {useActionCreators} from "@/hook";
import {userActions} from "@/store/slices/userReducer";
export type StatusType = "info" | "warning" | "success" | "error" | "loading" | undefined
type PropsType ={
    status:StatusType
    title:string
}
const AlertComponent:React.FC<PropsType> = ({status,title}) => {
    const [isLoaded, setIsLoaded] = useState(false);
const actions = useActionCreators({...userActions})
    useEffect(() => {
        const time = setTimeout(() => {
            setIsLoaded(true)
            actions.isUpdateProfile("info")
        }, 3000)

        return () => clearTimeout(time);
    }, [status]);

    if(status === "success") {
        return (<>
                {isLoaded && <Alert zIndex={10}  position={"absolute"} status={"success"} left={0} top={"20vh"}>
                    <AlertIcon />
                    <AlertTitle>{title}</AlertTitle>
                    {/*<AlertDescription>Your Chakra experience may be degraded.</AlertDescription>*/}
                </Alert> }</>

        );
    }
    if(status === "error") {
        return (<>
                {isLoaded && <Alert zIndex={10}  position={"absolute"} status={"error"} left={0} top={"20vh"}>
                    <AlertIcon />
                    <AlertTitle>{title}</AlertTitle>
                    {/*<AlertDescription>Your Chakra experience may be degraded.</AlertDescription>*/}
                </Alert> }</>

        );
    }
    return <></>

};

export default AlertComponent;