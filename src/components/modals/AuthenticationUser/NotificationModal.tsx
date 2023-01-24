import React from "react";
import {Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay} from "@chakra-ui/react";

type NotificationType = {
    isOpen: boolean
    onClose: () => void
    setStartWith: (startWith: "Start") => void
}

export const Notification: React.FC<NotificationType> = ({isOpen, onClose, setStartWith}) => {
    const onCloseHandler = () => {
        onClose();
        setStartWith('Start');
    }
    return (
        <>
            <Modal isOpen={isOpen} onClose={onCloseHandler}>
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader>Notification</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody pb={6}>
                        Please check your e-mail.
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    )
}