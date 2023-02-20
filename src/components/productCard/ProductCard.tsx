import {InitialProductStateType} from "@/store/slices/productReducer";
import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {Box, Flex, GridItem, Heading, IconButton, Image, Text, useDisclosure} from "@chakra-ui/react";
import {navigatePhotosObject} from "@/utils";
import {Trans} from "@lingui/macro";
import navIcon from "@/assets/map.svg";
import {DeleteIcon, EditIcon} from "@chakra-ui/icons";
import DeleteCardModal from "@/components/modals/DeleteCardModal";
import PublishListingModal from "../modals/PublishListingModal";
import {useAppSelector} from "@/hook";
import {userIdSelector} from "@/store";

type ProductCardType = {
    product: InitialProductStateType

}

export const ProductCard: React.FC<ProductCardType> = React.memo(({product}) => {
    const navigate = useNavigate();
    const userId = useAppSelector(userIdSelector)
    const {isOpen, onOpen, onClose} = useDisclosure();
    const [openEdit, setOpenEdit] = useState(false);

    const onNavigateToOneProductHandler = () => navigate(`/one-product/${product.post_type}/${product.id}`);

    return (
        <GridItem>
            <Image
                // loading={"eager"}
                rounded={'lg'}
                objectFit={'cover'}
                width="100%"
                height={250}
                cursor="pointer"
                borderRadius="10px"
                onClick={onNavigateToOneProductHandler}
                src={product.gif_url}
                alt="broken image"
            />
            <Box mt={3}>
                {
                    userId === product.user && <Flex justify={"center"}>
                        <IconButton onClick={() => setOpenEdit(true)}
                                    variant='outline'
                                    icon={<EditIcon/>}
                                    aria-label="update">
                        </IconButton>
                        <PublishListingModal
                            product={product} isOpen={openEdit} onClose={onClose} setOpenEdit={setOpenEdit}/>
                        <IconButton
                            ml={4}
                            onClick={onOpen}
                            variant='outline'
                            icon={<DeleteIcon/>}
                            aria-label="delete">
                            <Trans>Delete</Trans>
                        </IconButton>
                        <DeleteCardModal product={product} onClose={onClose} isOpen={isOpen}/>
                    </Flex>

                }
                <Flex justify="space-between" align="center" fontSize={25}>
                    <Heading noOfLines={1} fontSize={'xl'} fontFamily={'body'}
                             fontWeight={500}>
                        {product.post_name.toUpperCase()}
                    </Heading>
                    <Image
                        borderRadius='full'
                        src={navigatePhotosObject[product.post_type]}
                        alt={"img"}
                    />
                </Flex>
                <Flex pt={3} justify="space-between" alignItems="center" alignSelf="center">
                    <Text mt='1' color={'gray.500'} fontSize={'sm'}
                          textTransform={'uppercase'}><Trans>Distance:</Trans></Text>
                    <Text mt='1' ml="2" noOfLines={1} color={'black'} fontSize={'sm'} textTransform={'uppercase'}>
                        {product.post_address}
                    </Text>
                    <Image borderRadius='full' src={navIcon} alt={navIcon}
                    />
                </Flex>
                <Flex>
                    <Text mt='1' color={'gray.500'} fontSize={'sm'}
                          textTransform={'uppercase'}><Trans>Available:</Trans></Text>
                    <Text mt='1' ml="2" noOfLines={1} color={'black'} fontSize={'sm'} textTransform={'uppercase'}>
                        {product.pickup_time}
                    </Text>
                </Flex>

                <Flex>
                    <Text mt='1' color={'gray.500'} fontSize={'sm'}
                          textTransform={'uppercase'}><Trans>About:</Trans></Text>
                    <Text mt='1' ml="2" noOfLines={1} color={'black'} fontSize={'sm'} textTransform={'uppercase'}
                    >
                        {product.post_description}
                    </Text>
                </Flex>
            </Box>
        </GridItem>
    )
})