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
import {t, Trans} from "@lingui/macro";
import React from "react";

type ModalType = {
    buttonValue?:string
}

const PickUpRequestModal:React.FC<ModalType>=({buttonValue}) =>{
    const {isOpen, onOpen, onClose} = useDisclosure();

    const initialRef = React.useRef(null);
    const finalRef = React.useRef(null);

    return (
        <>
            <Button onClick={onOpen}  backgroundColor='#FF2D55' width="100%" variant='solid' colorScheme='blue'>
                {buttonValue ||  <Trans>Request Pick Up</Trans>}
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
                        <Trans>Enter pick-up request info</Trans>
                    </ModalHeader>
                    <ModalCloseButton/>

                    <ModalBody pb={6}>
                        <FormControl>
                            <FormLabel><Trans>Name</Trans></FormLabel>
                            <Input
                                ref={initialRef}
                                placeholder={t({
                                    id: `Full Name`,
                                    message: `Full Name`
                                })}
                            />
                        </FormControl>

                        <FormControl mt={4}>
                            <FormLabel><Trans>Email Address</Trans></FormLabel>
                            <Input
                                placeholder={t({
                                    id: `Email Address`,
                                    message: `Email Address`
                                })}
                            />
                        </FormControl>

                        <FormControl mt={4}>
                            <FormLabel><Trans>Phone Number</Trans></FormLabel>
                            <Input
                                placeholder={t({
                                    id: `Phone Number`,
                                    message: `Phone Number`
                                })}
                            />
                        </FormControl>

                        <Flex>
                            <FormControl mt={4}>
                                <FormLabel><Trans>Pick-up Day</Trans></FormLabel>

                                <Select w={"95%"} variant='outline' >
                                    <option value='option1'><Trans>Monday</Trans></option>
                                    <option value='option2'><Trans>Tuesday</Trans></option>
                                    <option value='option4'><Trans>Wednesday</Trans></option>
                                    <option value='option5'><Trans>Thursday</Trans></option>
                                    <option value='option6'><Trans>Friday</Trans></option>
                                    <option value='option7'><Trans>Saturday</Trans></option>
                                    <option value='option8'><Trans>Sunday</Trans></option>
                                </Select>
                            </FormControl>

                            <FormControl mt={4}>
                                <FormLabel><Trans>Pick-up Time</Trans></FormLabel>
                                <Input
                                    type='time'
                                />
                            </FormControl>

                        </Flex>
                    </ModalBody>

                    <ModalFooter>
                        <Button w="100%" onClick={onClose} colorScheme='red'>
                            <Trans>Submit</Trans>
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}

export default PickUpRequestModal