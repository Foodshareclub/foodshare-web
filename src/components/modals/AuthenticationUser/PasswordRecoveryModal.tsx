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
import {useActionCreators} from "@/hook";
import {senNewPasswordTC} from "@/store";


export const PasswordRecoveryModal = () => {
    
    const actions = useActionCreators({senNewPasswordTC})
    const {isOpen, onOpen, onClose} = useDisclosure();
    const [show, setShow] = useState(false);
    const [password, setPassword] = useState('');
    const showPass = () => setShow(true);
    const hidePass = () => setShow(false);

    useEffect(() => {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                onOpen();
            }
        })
    }, [onOpen]);
   
    const createPasswordHandler = async () => {
        actions.senNewPasswordTC(password)
        onClose();
    }

    return (
        <>
            <Modal
                closeOnEsc={false}
                closeOnOverlayClick={false}
                isOpen={isOpen}
                onClose={onClose}
                isCentered={true}
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