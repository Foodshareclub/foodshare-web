import React, {useEffect, useState} from 'react';
import {
    Button,
    FormControl,
    Input,
    InputGroup,
    InputRightElement,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    useDisclosure
} from "@chakra-ui/react";
import {supabase} from "@/supaBase.config";
import {ViewIcon, ViewOffIcon} from "@chakra-ui/icons";

export const PasswordRecoveryModal = () => {
    const {isOpen, onOpen, onClose} = useDisclosure();

    const initialRef = React.useRef(null);
    const finalRef = React.useRef(null);

    const [show, setShow] = useState(false);

    const showPass = () => setShow(true);
    const hidePass = () => setShow(false);

    useEffect(() => {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event == "PASSWORD_RECOVERY") {
                onOpen();
            }
        })
    }, []);

    const [password, setPassword] = useState('');

    const createPasswordHandler = async () => {
        const { data, error } = await supabase.auth.updateUser({ password });
        if(data.user?.id) {
            onClose();
        }else {
            console.log(error);
        }
    }

    return (
        <>
            <Modal
                closeOnEsc={false}
                closeOnOverlayClick={false}
                initialFocusRef={initialRef}
                finalFocusRef={finalRef}
                isOpen={isOpen}
                onClose={onClose}
            >
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader>Create new password</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody pb={6}>
                        <FormControl>

                            <InputGroup>
                                <Input
                                    variant="filled"
                                    onChange={(e) => setPassword(e.currentTarget.value)}
                                    value={password}
                                    placeholder="Password"
                                    type={show ? "text" : "password"}
                                />
                                <InputRightElement width='4.5rem'>
                                    <Button
                                        h='1.75rem'
                                        size='sm'
                                        onMouseDown={showPass}
                                        onMouseUp={hidePass}
                                        disabled={!password}
                                    >
                                        {show ? <ViewOffIcon/> : <ViewIcon/>}
                                    </Button>
                                </InputRightElement>
                            </InputGroup>

                        </FormControl>
                    </ModalBody>

                    <ModalFooter>
                        <Button
                            colorScheme='blue'
                            mr={3}
                            onClick={createPasswordHandler}
                            disabled={!password}
                        >
                            Save
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
};