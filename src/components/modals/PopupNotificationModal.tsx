import {
    Box,
    Flex,
    Heading,
    Image,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Text
} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";
import React from "react";
import calendar from "@/assets/image 22.png";
import likeUp from "@/assets/likeUp.svg";

type ModalType = {
    isOpen: boolean
    onClose: () => void
}

const PopupNotificationModal: React.FC<ModalType> = ({isOpen, onClose}) => {

    const initialRef = React.useRef(null);
    const finalRef = React.useRef(null);

    return (
        <Modal
            isCentered
            initialFocusRef={initialRef}
            finalFocusRef={finalRef}
            isOpen={isOpen}
            onClose={onClose}
        >
            <ModalOverlay/>
            <ModalContent>
                <ModalHeader>
                    <Heading size={"lg"} textAlign={"center"}><Trans>Say a day & time</Trans></Heading>
                </ModalHeader>
                <ModalCloseButton/>
                <ModalBody pb={6}>
                    <Image m={"0 auto"} w={200} src={calendar} alt={"calendar"}/>
                    <Box>
                        <Flex>
                            <Image pt={2} alignSelf={"start"} mr={2} w={4} src={likeUp} alt={"like up"}/>
                            <Text>Make sure to say when you can pick this up in your first message It will significantly
                                increase your chances of getting it.</Text>
                        </Flex>
                        <Flex mt={4}>
                            <Image pb={2} mr={2} transform={"auto"} rotate={180} w={4} src={likeUp} alt={"like down"}/>
                            <Text>Requesting delivery/mailing isn’t allowed.</Text>
                        </Flex>
                    </Box>
                </ModalBody>
            </ModalContent>
        </Modal>
    )
}

export default PopupNotificationModal