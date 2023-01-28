import React, {useState} from "react";
import {useAppDispatch} from "@/hook";
import {loginWithOtpTC, recoveryPasswordTC} from "@/store/slices/userReducer";
import {Notification} from "@/components";
import {Button, FormLabel, Input, useDisclosure} from "@chakra-ui/react";

type EmailAreaType = {
    setStartWith: (startWith: 'Start') => void
    operationType: 'Login' | 'Recovery'
}

export const EmailArea: React.FC<EmailAreaType> = ({
                                                       setStartWith,
                                                       operationType,
                                                   }) => {
    const dispatch = useAppDispatch();

    const {isOpen, onOpen, onClose} = useDisclosure();

    const [invalid, setInvalid] = useState('');
    const [email, setEmail] = useState('');


    const sendEmail = () => {
        if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            if (operationType === "Login") {
                dispatch(loginWithOtpTC(email));
            }

            if (operationType === "Recovery") {
                dispatch(recoveryPasswordTC(email));
            }
            onOpen();
            setEmail('');
        } else {
            setInvalid('Invalid email');
        }
    }

    return (
        <>
            <Notification isOpen={isOpen} onClose={onClose} setStartWith={setStartWith}/>

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
                title={'Insert an email address'}
                disabled={!email}
            >
                Continue
            </Button>

        </>
    )
}
