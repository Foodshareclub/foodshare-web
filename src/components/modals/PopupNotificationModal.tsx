import {
    Box,
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
import calendar from "@/assets/image 22.png";
import likeUp from "@/assets/likeUp.svg";
import strawberry from "@/assets/clubnika-min.webp";

import {StarIcon} from "@chakra-ui/icons";
import {useSearchParams} from "react-router-dom";
import {useActionCreators, useAppSelector} from "@/hook";
import {userIdFromSessionSelector, writeReviewTC} from "@/store";

type ModalType = {
    isOpen: boolean
    onClose: () => void
}
type FeedBackType = {
    id?: number
    reviewed_rating: number
    profile_id: string
    post_id: number
    forum_id?: number
    challenge_id?: number
    feedback: string
};

const PopupNotificationModal: React.FC<ModalType> = ({isOpen, onClose}) => {
    const [searchParams, setSearchParams] = useSearchParams(); //get params from url
    const actions = useActionCreators({writeReviewTC})
    const sharerId = searchParams.get('s') as string;
    const postId = searchParams.get('p') as string;
    const requesterId = searchParams.get('r') as string;
    const userID = useAppSelector(userIdFromSessionSelector);

    const initialRef = React.useRef(null);
    const finalRef = React.useRef(null);
    const [numberM, setNumberM] = useState<"first" | "second" | "threeth" | "fourth">("second");
    const [value, setValue] = useState(0);
    const [textArea, setTextArea] = useState('');

    const click = async () => {
        numberM === "second" && setNumberM("threeth");
        if (numberM === "threeth") {
            const feedback: FeedBackType = {
                reviewed_rating: Number(value),
                profile_id: sharerId === userID ? requesterId : sharerId,
                post_id: Number(postId),
                feedback: textArea
            };
            console.log(feedback, "feedback")
            await actions.writeReviewTC(feedback)
            setNumberM("fourth");
        }
    }
    console.log(numberM)
    return (
        <Modal
            isCentered
            initialFocusRef={initialRef}
            finalFocusRef={finalRef}
            isOpen={isOpen}
            onClose={() => {
                onClose();
                setNumberM("second")
            }}
        >
            <ModalOverlay/>
            <ModalContent>
                <ModalHeader>
                    {numberM === "first" &&
                        <Heading size={"lg"} textAlign={"center"}><Trans>Say a day & time</Trans></Heading>}

                    {numberM === "second" && <Heading pt={4} size={"md"} textAlign={"center"}>
                        <Trans>Congratulations, you guys made
                            it!</Trans>
                    </Heading>}
                    {numberM === "fourth" && <Heading pt={4} size={"md"} textAlign={"center"}>
                        <Trans>Thank you for your feedback it’s very important for us!</Trans>
                    </Heading>}
                </ModalHeader>
                <ModalCloseButton/>
                <ModalBody pb={6} pt={0}>
                    {numberM === "first" && <Image m={"0 auto"} w={200} src={calendar} alt={"calendar"}/>}
                    {numberM === "fourth" && <Image m={"0 auto"} w={200} src={strawberry} alt={"calendar"}/>}
                    {numberM === "second" && <>
                        <Image objectFit={"cover"} h={20} m={"0 auto 10px auto"} w={250} src={stars} alt={"stars"}/>
                        <Text fontWeight={"medium"} textAlign={"center"}>
                            <Trans>Would you like to leave feedback?</Trans>
                        </Text>
                    </>}
                    {numberM === "threeth" && <>
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
                    {(numberM === "second" || numberM === "threeth") && <Button
                        display={"block"}
                        m={"20px auto 0 auto"}
                        h={numberM === "second" ? 55 : 10}
                        backgroundColor='#FF2D55'
                        textTransform={"uppercase"}
                        variant='solid'
                        colorScheme='blue'
                        borderRadius={numberM === "second" ? "50%" : "10%"}
                        onClick={click}
                    >{numberM === "second" ? "yes" : "send"}
                    </Button>}
                    {numberM === "first" && <Box>
                        <Flex>
                            <Image pt={2} alignSelf={"start"} mr={2} w={4} src={likeUp} alt={"like up"}/>
                            <Text>Make sure to say when you can pick this up in your first message It will significantly
                                increase your chances of getting it.</Text>
                        </Flex>
                        <Flex mt={4}>
                            <Image pb={2} mr={2} transform={"auto"} rotate={180} w={4} src={likeUp} alt={"like down"}/>
                            <Text>Requesting delivery/mailing isn’t allowed.</Text>
                        </Flex>
                    </Box>}
                </ModalBody>
            </ModalContent>
        </Modal>
    )
};

export default PopupNotificationModal;