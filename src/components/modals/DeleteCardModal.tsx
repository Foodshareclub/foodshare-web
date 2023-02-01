import React from 'react';
import {
    Badge,
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay
} from "@chakra-ui/react";
import {useActionCreators} from "@/hook";
import {
    deleteProductTC,
    getCurrentUserProductsTC,
    InitialProductStateType,
    productActions
} from "@/store/slices/productReducer";

type PropsType = {
    onClose: () => void
    isOpen: boolean
    product: InitialProductStateType
}
const DeleteCardModal: React.FC<PropsType> = ({isOpen, onClose, product}) => {

    const actions = useActionCreators({getCurrentUserProductsTC, deleteProductTC, ...productActions});

    const deleteProductHandler = () => {
        actions.deleteProductTC(product.id);
        onClose();
    }

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
                    <Badge colorScheme='red'>{product.post_name}</Badge>.
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

export default DeleteCardModal;