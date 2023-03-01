import {
    Box, Button,
    Flex,
    Heading,
    Image,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Text, Textarea
} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";
import React, {useState} from "react";
import calendar from "@/assets/image 22.png";
import stars from "@/assets/starsForPopup.webp";
import likeUp from "@/assets/likeUp.svg";
import {StarIcon} from "@chakra-ui/icons";

type ModalType = {
    isOpen: boolean
    onClose: () => void
}

const PopupNotificationModal: React.FC<ModalType> = ({isOpen, onClose}) => {

    const initialRef = React.useRef(null);
    const finalRef = React.useRef(null);
    const [isChange, setIsChange] = useState(false)
    const [value, setValue] = useState(0)

    const click = () => {
        !isChange && setIsChange(true);
        if(isChange){
            console.log("feedback")
        }
    }
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
                    {/*<Heading size={"lg"} textAlign={"center"}><Trans>Say a day & time</Trans></Heading>*/}

                    {!isChange && <Heading pt={4} size={"md"} textAlign={"center"}>
                        <Trans>Congratulations, you guys made
                            it!</Trans>
                    </Heading>}
                </ModalHeader>
                <ModalCloseButton/>
                <ModalBody pb={6} pt={0}>
                    {/*<Image m={"0 auto"} w={200} src={calendar} alt={"calendar"}/>*/}
                    {!isChange ? <>
                            <Image objectFit={"cover"} h={20} m={"0 auto 10px auto"} w={250} src={stars} alt={"stars"}/>
                            <Text fontWeight={"medium"} textAlign={"center"}>
                                <Trans>Would you like to leave feedback?</Trans>
                            </Text>
                        </> :
                        <>
                            <Flex justify={"center"}>
                                {Array(5).fill('').map((item, i) => (
                                    <StarIcon w={10} h={10} onClick={()=>setValue(i+1)} key={i} color={i < value ? 'teal.500' : 'gray.300'}/>
                                ))}
                            </Flex>
                            <Textarea mt={5} isInvalid placeholder='write smth.' />
                        </>
                    }
                    <Button
                        display={"block"}
                        m={"20px auto 0 auto"}
                        h={55}
                        backgroundColor='#FF2D55'
                        textTransform={"uppercase"}
                        variant='solid'
                        colorScheme='blue'
                        borderRadius={!isChange ?"50%":"15%"}
                        onClick={click}
                    >{!isChange ? "yes":"send"}
                    </Button>
                    {/*<Box>*/}
                    {/*    <Flex>*/}
                    {/*        <Image pt={2} alignSelf={"start"} mr={2} w={4} src={likeUp} alt={"like up"}/>*/}
                    {/*        <Text>Make sure to say when you can pick this up in your first message It will significantly*/}
                    {/*            increase your chances of getting it.</Text>*/}
                    {/*    </Flex>*/}
                    {/*    <Flex mt={4}>*/}
                    {/*        <Image pb={2} mr={2} transform={"auto"} rotate={180} w={4} src={likeUp} alt={"like down"}/>*/}
                    {/*        <Text>Requesting delivery/mailing isn’t allowed.</Text>*/}
                    {/*    </Flex>*/}
                    {/*</Box>*/}
                </ModalBody>
            </ModalContent>
        </Modal>
    )
};

export default PopupNotificationModal;