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
    Select,
    useDisclosure
} from "@chakra-ui/react";
import React from "react";

type ModalType = {
    buttonValue?:string
}

const LoginModal:React.FC<ModalType>=({buttonValue="Login"}) =>{
    const {isOpen, onOpen, onClose} = useDisclosure()
    const initialRef = React.useRef(null)
    const finalRef = React.useRef(null)

    return (
        <>
            <Button onClick={onOpen}  backgroundColor='#FF2D55' width="100%" variant='solid' colorScheme='blue'>
                {buttonValue}
            </Button>

            <Modal
                initialFocusRef={initialRef}
                finalFocusRef={finalRef}
                isOpen={isOpen}
                onClose={onClose}
            >
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader>Enter pick-up request info </ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody pb={6}>
                        <FormControl>
                            <FormLabel>Full Name</FormLabel>
                            <Input ref={initialRef} placeholder='Full Name'/>
                        </FormControl>
                        <FormControl mt={4}>
                            <FormLabel>Email Address</FormLabel>
                            <Input placeholder='Email Address'/>
                        </FormControl>
                        <FormControl mt={4}>
                            <FormLabel>Phone Number</FormLabel>
                            <Input placeholder='Phone Number'/>
                        </FormControl>
                        <Flex>
                            <FormControl mt={4}>
                                <FormLabel>Pick-up Day</FormLabel>
                                <Select w={"95%"} variant='outline' >
                                    <option value='option1'>Monday</option>
                                    <option value='option2'>Tuesday</option>
                                    <option value='option4'>Wednesday</option>
                                    <option value='option5'>Thursday</option>
                                    <option value='option6'>Friday</option>
                                    <option value='option7'>Saturday</option>
                                    <option value='option8'>Sunday</option>
                                </Select>
                            </FormControl>
                            <FormControl mt={4}>
                                <FormLabel>Pick-up Time</FormLabel>
                                <Input type='time'/>
                            </FormControl>

                        </Flex>
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

export default LoginModal