import {
    Button,
    Flex,
    Heading,
    Image,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Text,
    Textarea
} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";
import React, {useState} from "react";
import stars from "@/assets/starsForPopup.webp";
import {StarIcon} from "@chakra-ui/icons";
import {useSearchParams} from "react-router-dom";
import {useAppSelector} from "@/hook";
import {userIdFromSessionSelector} from "@/store";

type ModalType = {
    isOpen: boolean
    onClose: () => void
}
type FeedBackType = {
    id?: number
    rewiewed_rating: number
    profile_id: string
    post_id: number
    forum_id?: number
    challenge_id?: number
    feedback: string
};

const PopupNotificationModal: React.FC<ModalType> = ({isOpen, onClose}) => {
    const [searchParams, setSearchParams] = useSearchParams(); //get params from url

    const sharerId = searchParams.get('s') as string;
    const postId = searchParams.get('p') as string;
    const requesterId = searchParams.get('r') as string;
    const userID = useAppSelector(userIdFromSessionSelector);

    const initialRef = React.useRef(null);
    const finalRef = React.useRef(null);
    const [isChange, setIsChange] = useState(false);
    const [value, setValue] = useState(0);
    const [textArea, setTextArea] = useState('');
    const click = () => {
        !isChange && setIsChange(true);
        if (isChange) {
            const feedback: FeedBackType = {
                rewiewed_rating: Number(value),
                profile_id: sharerId === userID ? requesterId : sharerId,
                post_id: Number(postId),
                feedback: textArea
            };
            console.log(feedback, "feedback")
            onClose()
        }
        console.log(isChange)
    }
   // console.log(isChange)
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
                                    <StarIcon w={10} h={10} onClick={() => setValue(i + 1)} key={i}
                                              color={i < value ? 'teal.500' : 'gray.300'}/>
                                ))}
                            </Flex>
                            <Textarea value={textArea} onChange={(e) => setTextArea(e.currentTarget.value)} mt={5}
                                      isInvalid placeholder='Please write smth.'/>
                        </>
                    }
                    <Button
                        display={"block"}
                        m={"20px auto 0 auto"}
                        h={!isChange ? 55 : 10}
                        backgroundColor='#FF2D55'
                        textTransform={"uppercase"}
                        variant='solid'
                        colorScheme='blue'
                        borderRadius={!isChange ? "50%" : "10%"}
                        onClick={click}
                    >{!isChange ? "yes" : "send"}
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