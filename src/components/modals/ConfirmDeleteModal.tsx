import React from "react";
import {
    Badge, Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay
} from "@chakra-ui/react";

type ConfirmDeleteModalType = {
    isOpen: boolean
    onClose: () => void
    deleteProduct: { id: number, productName: string }
    deleteProductHandler: () => void
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalType> = ({
                                                                         isOpen,
                                                                         onClose,
                                                                         deleteProduct,
                                                                         deleteProductHandler
                                                                     }) => {
    return (
        <Modal closeOnOverlayClick={false} isOpen={isOpen} onClose={onClose} isCentered size={"xs"}>
            <ModalOverlay/>
            <ModalContent>
                <ModalHeader>
                    Delete
                </ModalHeader>

                <ModalCloseButton/>

                <ModalBody pb={6}>
                    You are going to delete the product
                    <Badge colorScheme='red'>{deleteProduct.productName}</Badge>.
                    Are you sure?
                </ModalBody>

                <ModalFooter justifyContent={"space-between"}>
                    <Button
                        colorScheme='blue'
                        mr={3}
                        onClick={deleteProductHandler}
                    >
                        Yes
                    </Button>

                    <Button
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};