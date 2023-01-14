import {
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    MenuItem,
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
import React, {useEffect, useState} from "react";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {useForm} from "react-hook-form";
import Avatar from "../avatar/Avatar";
import {getValueFromDBTC, updateProfileTC, uploadImgFromDBTC} from "../../store/slices/userReducer";
import {AllValuesType} from "../../api/profileAPI";


type ModalType = {
    buttonValue?: string
}

const UpdateProfileModal: React.FC<ModalType> = ({buttonValue = "Update Profile"}) => {

    const {user} = useAppSelector(state => state.user.session);
    const value = useAppSelector<AllValuesType | null>(state => state.user.value);

    let randomNumber = Math.floor(Math.random() * new Date().getTime());
    const [avatar_url, setAvatar_url] = useState('')
    const [filePath, setFilePath] = useState('')
    const [file, setFile] = useState<File>({} as File)
    const dispatch = useAppDispatch();
    useEffect(() => {
        if (user.id) {
            const values = {
                fromTableName: "profiles",
                columnValue: 'id',
                columnValueItem: user.id,
                selectRow: "*"
            }
            dispatch(getValueFromDBTC(values))
        }
    }, [])


    console.log(value)

    const onUpload = (filePath: string, url: string, file: File) => {
        setAvatar_url(url)
        setFilePath(filePath)
        setFile(file)
    }

    const {isOpen, onOpen, onClose} = useDisclosure()
    const initialRef = React.useRef(null)
    const finalRef = React.useRef(null)

    const defaultValues = {
        liked_post: value && value.liked_post,
        about_me: value && value.about_me,
        avatar_url: value && value.avatar_url,
        birth_date: value && value.birth_date,
        first_name: value && value.first_name,
        phone_number: value && value.phone_number,
        second_name: value && value.second_name,
        updated_at: new Date(),
        user_address: value && value.user_address,
        user_location: value && value.user_location,
        user_metro_station: value && value.user_metro_station,
        username: value && value.username
    }
    const {
        register,
        handleSubmit,
        formState: {errors, isValid}
    } = useForm({
        defaultValues,
        mode: "onChange"
    });
    type DefValuesType = typeof defaultValues


    const onSubmit = async (values: DefValuesType) => {

        let update = {...values, avatar_url: filePath}
        if (filePath) {
            await dispatch(uploadImgFromDBTC({dir: 'avatars', filePath, file}))
        }
        await dispatch(updateProfileTC({
            ...update,
            address_id: value && value.address_id || randomNumber.toString(),
            created_time: user.created_at,
            email: user.email,
            password: null,
            id: user.id,
            liked_post: value && value.liked_post
        }))
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
            >
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader>Welcome to Foodshare</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody pb={6}>
                        <form onSubmit={handleSubmit(onSubmit)}>

                            <Avatar url={value && value.avatar_url} size={150}
                                    onUpload={(filePath, url, file) => {
                                        onUpload(filePath, url, file)
                                    }} uploading={false}/>

                            <FormControl mt={4} isInvalid={!!errors.about_me}>
                                <FormLabel>About me</FormLabel>
                                <Textarea
                                    {...register("about_me")}
                                    placeholder={value && value.about_me || 'Enter about...'}
                                />
                            </FormControl>
                            <FormControl isInvalid={!!errors.first_name}>
                                <FormLabel>First name</FormLabel>
                                <Input mb={3}

                                       variant="filled"
                                       {...register("first_name")}
                                       placeholder={value && value.first_name || "First Name"}
                                />
                                <FormErrorMessage>
                                    {errors.first_name && errors.first_name.message}
                                </FormErrorMessage>
                            </FormControl>
                            <FormControl isInvalid={!!errors.second_name}>
                                <FormLabel>Second Name</FormLabel>
                                <Input mb={3}
                                       variant="filled"
                                       {...register("second_name")}
                                       placeholder={value && value.second_name || "Second Name"}
                                />
                                <FormErrorMessage>
                                    {errors.second_name && errors.second_name.message}
                                </FormErrorMessage>
                            </FormControl>
                            <FormControl isInvalid={!!errors.user_address}>
                                <FormLabel>User Address</FormLabel>
                                <Input mb={3}
                                       variant="filled"
                                       {...register("user_address")}
                                       placeholder={value && value.user_address || "User Address"}
                                />
                                <FormErrorMessage>
                                    {errors.user_address && errors.user_address.message}
                                </FormErrorMessage>
                            </FormControl>

                            <Button isLoading={false} fontSize={25} variant="solid" m={"10% 0"}
                                    w="100%" alignSelf="center" type="submit"
                                    disabled={!isValid}>
                                Update
                            </Button>
                        </form>
                    </ModalBody>
                    <ModalFooter>

                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}

export default UpdateProfileModal