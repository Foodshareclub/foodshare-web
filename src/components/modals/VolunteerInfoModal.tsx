import {
    Button,
    Flex,
    FormControl,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Textarea,
    useDisclosure
} from "@chakra-ui/react";
import React, {useState} from "react";

function VolunteerInfoModal() {
    const {isOpen, onOpen, onClose} = useDisclosure();

    const initialRef = React.useRef(null);
    const finalRef = React.useRef(null);

    let [value, setValue] = useState('');

    let handleInputChange = (value: React.SetStateAction<string>) => setValue(value);

    return (
        <>
            <Button onClick={onOpen}
                    mt={6}
                    borderColor={"#55BCB2"}
                    borderRadius={20}
                    variant={"outline"}>
                Volunteer
            </Button>

            <Modal
                initialFocusRef={initialRef}
                finalFocusRef={finalRef}
                isOpen={isOpen}
                onClose={onClose}
            >
                <ModalOverlay/>

                <ModalContent>
                    <ModalHeader>
                        Enter Volunteer Info
                    </ModalHeader>

                    <ModalCloseButton/>

                    <ModalBody pb={6}>
                        <FormControl>
                            <FormLabel>
                                Full Name
                            </FormLabel>

                            <Input ref={initialRef} placeholder='Full Name'/>
                        </FormControl>

                        <FormControl mt={4}>
                            <FormLabel>
                                Email Address
                            </FormLabel>
                            <Input placeholder='Email Address'/>
                        </FormControl>

                        <FormControl mt={4}>
                            <FormLabel>
                                Phone Number
                            </FormLabel>
                            <Input placeholder='Phone Number'/>
                        </FormControl>

                        <Flex>
                            <FormControl mt={4}>
                                <FormLabel>
                                    Vehicle Make
                                </FormLabel>
                                <Input placeholder='Honda'/>
                            </FormControl>

                            <FormControl mt={4}>
                                <FormLabel>
                                    Vehicle Model
                                </FormLabel>
                                <Input placeholder='Civic'/>
                            </FormControl>
                        </Flex>

                        <FormControl mt={4}>
                            <FormLabel>
                                Vehicle Model
                            </FormLabel>

                            <Textarea
                                value={value}
                                onChange={(e) => handleInputChange(e.currentTarget.value)}
                                placeholder='Enter...'
                            />
                        </FormControl>
                    </ModalBody>

                    <ModalFooter>
                        <Button w="100%" onClick={onClose} colorScheme='red'>
                            Submit
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}

export default VolunteerInfoModal