import React, {useEffect, useState} from 'react';

import {
    Badge,
    Box,
    Button,
    Flex,
    Heading, Modal,
    ModalBody, ModalCloseButton,
    ModalContent, ModalFooter,
    ModalHeader,
    ModalOverlay,
    SimpleGrid, useDisclosure
} from "@chakra-ui/react";

import {Trans} from "@lingui/macro";
import {Navigate} from "react-router-dom";
import {useActionCreators, useAppSelector, useGridSize} from "@/hook";
import {deleteProductTC, getCurrentUserProductsTC, productActions} from "@/store/slices/productReducer";
import {AlertComponent, ListingPersonCard, ProductCard, PublishListingModal} from "@/components";
import {
    imgURLSelector,
    isAuthSelector,
    userFirstNameSelector,
    userIdSelector,
    userSecondNameSelector,currentUserProductsSelector,
    isUpdateProductSelector, messageProductSelector,
} from "@/store";


const MyListingsPage = () => {
    const { isOpen, onOpen, onClose } = useDisclosure();

    const gridSize = useGridSize();

    const userId = useAppSelector(userIdSelector);
    const isUpdateProduct = useAppSelector(isUpdateProductSelector);
    const currentUserProducts = useAppSelector(currentUserProductsSelector);
    const isAuth = useAppSelector(isAuthSelector);
    const userFirstName = useAppSelector(userFirstNameSelector);
    const userSecondName = useAppSelector(userSecondNameSelector);
    const imgUrl = useAppSelector(imgURLSelector);
    const productMessage = useAppSelector(messageProductSelector);

    const actions = useActionCreators({getCurrentUserProductsTC, deleteProductTC, ...productActions});

    useEffect(() => {
        if (userId) actions.getCurrentUserProductsTC(userId);
    }, [isUpdateProduct, userId]);


    const [deleteProduct, setDeleteProduct] = useState<{id: number, productName: string }>({id: 0, productName: ""});

    const onConfirmDeleteModalHandler = (productID: number, productName: string) => {
        setDeleteProduct({id: productID, productName });
        onOpen();
    }

    const deleteProductHandler = () => {
        actions.deleteProductTC(deleteProduct.id);

        onClose();
    }

    if (!isAuth) {
        return <Navigate to='/'/>
    }

    return (
        <Box mt="20vh">
            <AlertComponent
                status={isUpdateProduct}
                title={productMessage}
                top={"94%"}
            />

            <Flex  direction={"column"} justify="space-between">
                <Box>
                    <ListingPersonCard
                        userFirstName={userFirstName}
                        userSecondName={userSecondName}
                        imgUrl={imgUrl}
                    >
                        <Box pt={5}>
                            <PublishListingModal userID={userId}/>
                        </Box>

                    </ListingPersonCard>
                </Box>

                <Heading my={8} textAlign={"center"}>
                    <Trans>Active Listings</Trans>
                </Heading>

                <SimpleGrid p={8}
                            columns={gridSize}
                            spacing={10}>
                    {
                        currentUserProducts.length > 0
                        && currentUserProducts.map((item, id) => (
                        <ProductCard
                            deleteProductHandler={(productID) => onConfirmDeleteModalHandler(productID, item.post_name)}
                            product={item}
                            key={id}
                        />
                    ))}
                </SimpleGrid>
            </Flex>

            <Modal closeOnOverlayClick={false} isOpen={isOpen} onClose={onClose} isCentered size={"xs"}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        Delete
                    </ModalHeader>

                    <ModalCloseButton />

                    <ModalBody pb={6} >
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
        </Box>

    );
};

export default MyListingsPage;