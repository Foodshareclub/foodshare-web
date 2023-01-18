import React, {useEffect, useState} from 'react';
import {Button, FormLabel, Input, InputGroup, InputLeftElement, InputRightElement} from "@chakra-ui/react";
import {useAppDispatch} from "../../../hook/hooks";
import {PhoneIcon} from "@chakra-ui/icons";

type PhoneAreaType = {
    setStartWith: (startWith: 'Start') => void
}


export const PhoneArea: React.FC<PhoneAreaType> = ({setStartWith}) => {
    const dispatch = useAppDispatch();

    const [phone, setPhone] = useState('');
    const [pass, setPass] = useState('');
    const [code, setCode] = useState('');
    const [show, setShow] = useState(false);
    const [codeField, setCodeField] = useState(false);

    const handleClick = () => setShow(!show);

    const getCode = () => {
        //dispatch('') //first dispatch with phone number and pass
        setCodeField(true);
        setTime(5);
    }

    const [time, setTime] = useState(5);

    useEffect(() => {
            let timer = setInterval(() => {
                codeField
                && setTime((interval) => interval >= 1 ? interval - 1 : 0);
            }, 1000)

            return () => clearInterval(timer);
        }, [codeField]
    );
    console.log('render')

    const sendCode = () => {
        //dispatch('') // second dispatch with phone and code
        setStartWith('Start');
    }

    if (code.length === 6) {
        sendCode();
    }

    return (
        <>
            <FormLabel>Phone</FormLabel>
            <InputGroup mb={3}>
                <InputLeftElement
                    pointerEvents='none'
                    children={<PhoneIcon color='gray.300'/>}
                />
                <Input type='tel' placeholder='Phone number' value={phone}
                       onChange={(e) => setPhone(e.currentTarget.value)}/>
            </InputGroup>

            <FormLabel>Password</FormLabel>
            <InputGroup size='md'>
                <Input
                    pr='4.5rem'
                    type={show ? 'text' : 'password'}
                    placeholder='Enter password'
                    value={pass}
                    onChange={(e) => setPass(e.currentTarget.value)}
                />
                <InputRightElement width='4.5rem'>
                    <Button h='1.75rem' size='sm' onClick={handleClick}>
                        {show ? 'Hide' : 'Show'}
                    </Button>
                </InputRightElement>
            </InputGroup>

            {codeField && <InputGroup size='md' mt={3}>
                <Input
                    placeholder='Insert code'
                    value={code}
                    onChange={(e) => setCode(e.currentTarget.value)}
                    type="number"
                />
                {/*<Button*/}
                {/*    colorScheme={'red'}*/}
                {/*>Send*/}
                {/*</Button>*/}
            </InputGroup>}

            <Button
                fontSize={25}
                variant="solid"
                m={"10% 0"}
                w="100%"
                alignSelf="center"
                onClick={getCode}
                disabled={time !== 5 && !!time}
            >
                Get Code
            </Button>
        </>
    );
};

