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
import {savePhotoOnServer} from "../../utils/savePhotoOnServer";
import cloud from "../../assets/cloud.svg"

const PublishListingModal = () => {
    const toast = useToast()
    const {isOpen, onOpen, onClose} = useDisclosure()
    const initialRef = useRef(null)
    const finalRef = useRef(null)

    const inputFileRef = useRef<HTMLInputElement | null>(null)

    let [value, setValue] = useState('')
    let [value2, setValue2] = useState<string | undefined>('')

    const statuses = ['success', 'error', 'warning', 'info']

    let handleInputChange = (value: React.SetStateAction<string>) => {
        setValue(value)
    }
    const handleChangeFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const data = await savePhotoOnServer(event);
        setValue2(data)
    }
    const publishHandler = () => {
        onClose()
        toast({
            title: 'Listing created.',
            description: "We've created your Listing for you.",
            status: 'success',
            isClosable: true,
        })
    }
    return (
        <>
            <Button onClick={onOpen} background={"#ff2d55"}
                    _hover={{bg: '#c92040'}}
                    color="#ffffff"
                    variant={"solid"}>Add Listing</Button>
            <Modal
                initialFocusRef={initialRef}
                finalFocusRef={finalRef}
                isOpen={isOpen}
                onClose={onClose}
                size={"xl"}
            >
                <ModalOverlay/><ModalContent>
                <ModalCloseButton/>
                <ModalBody pb={6}>
                    <FormControl mt={10}>
                        <Flex _hover={{bg: 'gray.50'}} justify={"space-between"} p={4} border="1px dashed #2D9CDB"
                              borderRadius={10}>
                            {value2 ?
                                <img style={{maxWidth: "50%", borderRadius: "10px", margin: '0 auto'}} src={value2}
                                     alt={value2}/> :
                                <>
                                    <Box alignSelf={"center"}>
                                        <Image borderRadius='full'
                                               boxSize='50px' src={cloud}/>
                                    </Box>
                                    <Box>
                                        <Text>Select a file or drag and drop here</Text>
                                        <Text>JPG or PNG file size no more than 10MB</Text>
                                    </Box>
                                </>
                            }
                            <Box alignSelf={"center"}>
                                <Input accept=".png, .jpg" ref={inputFileRef} type="file"
                                       onChange={(e) => handleChangeFile(e)} hidden/>
                                <Button onClick={() => inputFileRef?.current?.click()} background={"#ff2d55"}
                                        _hover={{bg: '#c92040'}}
                                        color="#ffffff">Download
                                </Button>
                            </Box>
                        </Flex>
                        {/*<img style={{maxWidth: "50%",borderRadius:"10px",marginTop:"10px"}} src={value2} alt={value2}/>*/}
                    </FormControl>
                    <FormControl mt={4}>
                        <FormLabel>Category</FormLabel>
                        <Select variant='outline' placeholder="Select...">
                            <option value='option1'>Some text</option>
                        </Select>
                    </FormControl>
                    <FormControl mt={4}>
                        <FormLabel>Item Description</FormLabel>
                        <Textarea
                            value={value}
                            onChange={(e) => handleInputChange(e.currentTarget.value)}
                            placeholder='Enter...'
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Pick Up Address</FormLabel>
                        <Input ref={initialRef} placeholder='Enter...'/>
                    </FormControl>
                    <FormControl mt={4}>
                        <FormLabel>Address 2</FormLabel>
                        <Input placeholder='Enter...'/>
                    </FormControl>
                    <FormControl mt={4}>
                        <FormLabel>Phone Number</FormLabel>
                        <Input placeholder='Enter...'/>
                    </FormControl>
                    <Flex>
                        <FormControl mr={2} w="40%" mt={4}>
                            <FormLabel>City</FormLabel>
                            <Input placeholder='Enter...'/>
                        </FormControl>
                        <Flex w="60%">
                            <FormControl mr={2} mt={4}>
                                <FormLabel>State</FormLabel>
                                <Select variant='outline' placeholder="Select...">
                                    <option value='option1'>Some text</option>
                                </Select>
                            </FormControl>
                            <FormControl mt={4}>
                                <FormLabel>Zipcode</FormLabel>
                                <Input placeholder='Enter...'/>
                            </FormControl>
                        </Flex>

                    </Flex>
                    <Flex>
                        <FormControl mr={2} w="40%" mt={4}>
                            <FormLabel>Quantity</FormLabel>
                            <Input placeholder='Enter...'/>
                        </FormControl>
                        <FormControl w="60%" mt={4}>
                            <FormLabel>Availability</FormLabel>
                            <Input placeholder='Enter...'/>
                        </FormControl>
                    </Flex>
                </ModalBody>
                <ModalFooter>
                    <Button w="100%" onClick={() => publishHandler()} colorScheme='red'>
                        Publish Listing
                    </Button>
                </ModalFooter>
            </ModalContent>
            </Modal>
        </>
    )
        ;
};

export default PublishListingModal;