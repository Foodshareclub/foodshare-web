import {
    Button,
    FormControl,
    FormLabel,
    Input,
    MenuItem,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Textarea,
    useDisclosure
} from "@chakra-ui/react";
import React, {ChangeEvent, useEffect, useLayoutEffect, useState} from "react";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import Avatar from "../avatar/Avatar";
import {updateProfileTC, uploadImgFromDBTC} from "../../store/slices/userReducer";
import {AllValuesType} from "../../api/profileAPI";


type ModalType = {
    buttonValue?: string
}

const UpdateProfileModal: React.FC<ModalType> = ({buttonValue = "Update Profile"}) => {
    const dispatch = useAppDispatch();
    const {user} = useAppSelector(state => state.user.session);
    const value = useAppSelector<AllValuesType>(state => state.user.value);
    useLayoutEffect(() => {
        setFirstName(value.first_name)
        setAddress(value.user_address)
        setSecondName(value.second_name)
        setAbout(value.about_me)
        console.log("render")
    }, [value])
    const {isOpen, onOpen, onClose} = useDisclosure()
    const initialRef = React.useRef(null)
    const finalRef = React.useRef(null)

    const [filePath, setFilePath] = useState('')
    const [file, setFile] = useState<File>({} as File)

    const [firstName, setFirstName] = useState<string>("")
    const [secondName, setSecondName] = useState<string>("")
    const [about, setAbout] = useState<string>("")
    const [address, setAddress] = useState<string>("")
    let randomNumber = Math.floor(Math.random() * new Date().getTime());

    const onUpload = (filePath: string, file: File) => {
        setFilePath(filePath)
        setFile(file)
    }
    const changeFirstName = (e: ChangeEvent<HTMLInputElement>) => {
        setFirstName(e.currentTarget.value)
    }
    const changeSecondName = (e: ChangeEvent<HTMLInputElement>) => {
        setSecondName(e.currentTarget.value)
    }
    const changeAbout = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setAbout(e.currentTarget.value)
    }
    const changeUserAddress = (e: ChangeEvent<HTMLInputElement>) => {
        setAddress(e.currentTarget.value)
    }
    const defaultValues = {
        liked_post: value && value.liked_post,
        about_me: about,
        avatar_url: value && value.avatar_url,
        birth_date: value && value.birth_date,
        first_name: firstName,
        phone_number: value && value.phone_number,
        second_name: secondName,
        updated_at: new Date(),
        user_address: address,
        user_location: value && value.user_location,
        user_metro_station: value && value.user_metro_station,
        username: value && value.username,
        address_id: value && value.address_id || randomNumber.toString(),
        created_time: user.created_at || value && value.created_time,
        password: null,
        email: user.email,
        id: user.id,
    }
    const onClick = async () => {
        let update = {...defaultValues, avatar_url: filePath || value && value.avatar_url}

        await dispatch(updateProfileTC(update))
        if (filePath) {
            await dispatch(uploadImgFromDBTC({dir: 'avatars', filePath, file}))
        }
        setFilePath('')
        setFile({} as File)
        onClose()
    };

    return (
        <>
            <MenuItem onClick={onOpen}>{buttonValue}</MenuItem>
            <Modal
                initialFocusRef={initialRef}
                finalFocusRef={finalRef}
                isOpen={isOpen}
                onClose={onClose}
                size={"xl"}
            >
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader>Welcome to Foodshare</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody pb={6}>
                        <Avatar url={value && value.avatar_url} size={150}
                                onUpload={(filePath, file) => {
                                    onUpload(filePath, file)
                                }}/>

                        <FormControl mt={4}>
                            <FormLabel>About me</FormLabel>
                            <Textarea
                                onChange={(e) => {
                                    changeAbout(e)
                                }}
                                value={about}
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>First name</FormLabel>
                            <Input mb={3}
                                   onChange={(e) => {
                                       changeFirstName(e)
                                   }}
                                   value={firstName}
                                   variant="filled"
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>Second Name</FormLabel>
                            <Input mb={3}
                                   onChange={(e) => {
                                       changeSecondName(e)
                                   }}
                                   variant="filled"
                                   value={secondName}
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>User Address</FormLabel>
                            <Input mb={3}
                                   onChange={(e) => {
                                       changeUserAddress(e)
                                   }}
                                   variant="filled"
                                   value={address}
                            />
                        </FormControl>

                        <Button onClick={onClick} fontSize={25} variant="solid" m="10% 0"
                                w="100%" alignSelf="center"
                                disabled={false}>
                            Update
                        </Button>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    )
}

export default UpdateProfileModal