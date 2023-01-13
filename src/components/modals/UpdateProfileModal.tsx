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
import {getValueFromDBTC} from "../../store/slices/userReducer";

type ModalType = {
    buttonValue?: string
}

const UpdateProfileModal: React.FC<ModalType> = ({buttonValue = "Update Profile"}) => {
    const {session, imgUrl, value} = useAppSelector(state => state.user);
    const [avatar_url, setAvatar_url] = useState('')
    const dispatch = useAppDispatch();
    useEffect(() => {
        if (session.user.id) {
            const values = {
                fromTableName: "profiles",
                columnValue: 'id',
                columnValueItem: session.user.id,
                selectRow: "avatar_url"
            }
            dispatch(getValueFromDBTC(values))
        }
    }, [])
    // if(value){
    //     const obj:ImgUrlType ={
    //         dir:"avatars",
    //         imgUrl:value.avatar_url
    //     }
    //     dispatch(downloadImgFromDBTC(obj))
    //     console.log(value)
    // }
    console.log(value)
    const onUpload = (filePath: string, url: string) => {
        setAvatar_url(url)
    }
    let [value2, setValue2] = useState('')
    const {isOpen, onOpen, onClose} = useDisclosure()
    const initialRef = React.useRef(null)
    const finalRef = React.useRef(null)
    const defaultValues = {
        about_me: "",
        avatar_url: "",
        birth_date: "",
        first_name: "",
        phone_number: "",
        second_name: "",
        updated_at: new Date(),
        user_address: "",
        user_location: "",
        user_metro_station: "",
        username: ""
    }
    const {
        register,
        handleSubmit,
        formState: {errors, isValid}
    } = useForm({
        defaultValues,
        mode: "onChange"
    });

    const [show, setShow] = useState(false)
    const handleClick = () => setShow(!show)

    const onSubmit = async (values: any) => {
        console.log(values)
        // await dispatch(loginTC(values));
        onClose()
    };
    let handleInputChange = (value: React.SetStateAction<string>) => {
        setValue2(value)
    }

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

                            <Avatar url={avatar_url} size={150} onUpload={(filePath, url) => {
                                onUpload(filePath, url)
                            }} uploading={false}/>

                            <FormControl mt={4} isInvalid={!!errors.about_me}>
                                <FormLabel>About me</FormLabel>
                                <Textarea
                                    {...register("about_me")}
                                    value={value2}
                                    onChange={(e) => handleInputChange(e.currentTarget.value)}
                                    placeholder='Enter about...'
                                />
                            </FormControl>
                            <FormControl isInvalid={!!errors.first_name}>
                                <FormLabel>First name</FormLabel>
                                <Input mb={3}
                                       variant="filled"
                                       {...register("first_name")}
                                       placeholder="First name"
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
                                       placeholder="Second Name"
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
                                       placeholder="User Address"
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