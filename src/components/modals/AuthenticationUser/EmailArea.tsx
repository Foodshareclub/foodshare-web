import React, {useState} from "react";
import {useAppDispatch} from "../../../hook/hooks";
import {loginWithOtpTC} from "../../../store/slices/userReducer";
import {Button, FormLabel, Input} from "@chakra-ui/react";

type EmailAreaType = {
    setStartWith: (startWith: 'Start' ) => void
}

export const EmailArea: React.FC<EmailAreaType> = ({setStartWith}) => {
    const dispatch = useAppDispatch();

    const [invalid, setInvalid] = useState('');
    const [email, setEmail] = useState('');

    const sendEmail = () => {
        if(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            dispatch(loginWithOtpTC(email));
            setStartWith('Start');
        }else {
            setInvalid('Invalid email');
        }
    }
    return (
        <>
            <FormLabel>{invalid || 'Email'}</FormLabel>
            <Input
                variant="filled"
                placeholder="Email"
                value={email}
                isInvalid={!!invalid}
                onChange={(e) => setEmail(e.currentTarget.value)}
                onClick={() => setInvalid('')}
            />
            <Button
                fontSize={25}
                variant="solid"
                m={"10% 0"}
                w="100%"
                alignSelf="center"
                onClick={sendEmail}
            >
                Continue
            </Button>
        </>
    )
}