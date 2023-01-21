import React, {useRef, useState} from 'react';
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Image,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalOverlay,
    Select,
    Text,
    Textarea,
    useDisclosure,
    useToast
} from "@chakra-ui/react";
import {createPhotoUrl} from "../../utils/createPhotoUrl";
import cloud from "../../assets/cloud.svg"
import {createProductTC} from "../../store/slices/foodReducer";
import {useAppDispatch} from "../../hook/hooks";
import {t, Trans} from '@lingui/macro';

type PublishListingModalType = {
    userID: string
}

const PublishListingModal: React.FC<PublishListingModalType> = ({userID}) => {
    const dispatch = useAppDispatch()
    const toast = useToast()
    const {isOpen, onOpen, onClose} = useDisclosure()

    const initialRef = useRef(null)
    const finalRef = useRef(null)

    const inputFileRef = useRef<HTMLInputElement | null>(null)

    const statuses = ['success', 'error', 'warning', 'info']

    const [imgUrl, setImgUrl] = useState<string>('')
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [time, setTime] = useState('');
    const [address, setAddress] = useState('');
    const [metroStation, setMetroStation] = useState('');

    const handleChangeFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const img = createPhotoUrl(event);
        setImgUrl(img.url);//  get photo URL
    }

    const productObj = {
        gif_url: imgUrl,
        post_type: category,
        post_name: title,
        post_description: description,
        pickup_time: time,
        post_address: address,
        post_metro_station: metroStation,
        user: userID
    }


    const publishHandler = () => {
        dispatch(createProductTC(productObj))
        onClose()
        toast({
            title: 'Listing created.',
            description: "We've created your Listing for you.",
            status: 'success',
            isClosable: true,
        })
        setImgUrl('')
    }
    return (
        <>
            <Button onClick={onOpen} background={"#ff2d55"}
                    _hover={{bg: '#c92040'}}
                    color="#ffffff"
                    variant="solid"
            >
                <Trans>Add Listing</Trans>
            </Button>

            <Modal
                initialFocusRef={initialRef}
                finalFocusRef={finalRef}
                isOpen={isOpen}
                onClose={onClose}
                size="xl"
            >
                <ModalOverlay/>

                <ModalContent>
                    <ModalCloseButton/>

                    <ModalBody pb={6}>
                        <FormControl mt={10}>
                            <Flex _hover={{bg: 'gray.50'}} justify="space-between" p={4} border="1px dashed #2D9CDB"
                                  borderRadius={10}>
                                {
                                    imgUrl
                                        ? <img style={{maxWidth: "50%", borderRadius: "10px", margin: '0 auto'}}
                                               src={imgUrl}
                                               alt={imgUrl}
                                        />
                                        : <>
                                            <Box alignSelf={"center"}>
                                                <Image borderRadius='full'
                                                       boxSize='50px' src={cloud}/>
                                            </Box>
                                            <Box>
                                                <Text><Trans>Select a file or drag and drop here</Trans></Text>
                                                <Text> <Trans>JPG or PNG file size no more than 10MB</Trans></Text>
                                            </Box>
                                        </>
                                }

                                <Box alignSelf="center">
                                    <Input opacity={0} position="absolute" h="100%" left={0} top={0}
                                           accept=".png, .jpg" ref={inputFileRef} type="file"
                                           onChange={(e) => handleChangeFile(e)}/>

                                    <Button onClick={() => inputFileRef?.current?.click()} background={"#ff2d55"}
                                            _hover={{bg: '#c92040'}}
                                            color="#ffffff">
                                        <Trans>Download</Trans>
                                    </Button>
                                </Box>
                            </Flex>
                        </FormControl>

                        <FormControl mt={4}>
                            <FormLabel><Trans>Category</Trans></FormLabel>
                            <Select variant='outline'
                                    placeholder={t({
                                        id: `Select category`,
                                        message: `Select category`
                                    })}
                                    onChange={(e) => setCategory(e.currentTarget.value)}
                            >
                                <option value='food'><Trans>Food</Trans></option>
                                <option value='things'><Trans>Things</Trans></option>
                                <option value='borrow'><Trans>Borrow</Trans></option>
                                <option value='wanted'><Trans>Wanted</Trans></option>
                            </Select>
                        </FormControl>

                        <FormControl mt={4}>
                            <FormLabel><Trans>Title</Trans></FormLabel>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.currentTarget.value)}/// handler
                                placeholder={t({
                                    id: `What is it called`,
                                    message: `What is it called`
                                })}
                            />
                        </FormControl>

                        <FormControl mt={4}>
                            <FormLabel><Trans>Description</Trans></FormLabel>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.currentTarget.value)}
                                placeholder={t({
                                    id: `A few words about...`,
                                    message: `A few words about...`
                                })}
                            />
                        </FormControl>

                        <FormControl mt={4}>
                            <FormLabel><Trans>Time</Trans></FormLabel>
                            <Input
                                value={time}
                                onChange={(e) => setTime(e.currentTarget.value)}
                                placeholder={t({
                                    id: `When you will be ready to give`,
                                    message: `When you will be ready to give`
                                })}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel><Trans>Address</Trans></FormLabel>
                            <Input
                                value={address}
                                onChange={(e) => setAddress(e.currentTarget.value)}
                                placeholder={t({
                                    id: `Where you will be`,
                                    message: `Where you will be`
                                })}
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel><Trans>Metro Station</Trans></FormLabel>
                            <Input
                                value={metroStation}
                                onChange={(e) => setMetroStation(e.currentTarget.value)}
                                placeholder={t({
                                    id: `Nearest station`,
                                    message: `Nearest station`
                                })}/>
                        </FormControl>
                    </ModalBody>

                    <ModalFooter>
                        <Button
                            w="100%"
                            onClick={() => publishHandler()}
                            colorScheme='red'
                        >
                            <Trans>Publish Listing</Trans>
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

export default PublishListingModal;