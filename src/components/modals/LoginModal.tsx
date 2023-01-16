import {
    Button,
    Flex,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Image,
    Input,
    InputGroup,
    InputRightElement,
    MenuItem,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    useDisclosure
} from "@chakra-ui/react";
import React, {useState} from "react";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {NavLink, useNavigate} from "react-router-dom";
import {useForm} from "react-hook-form";
import {loginTC} from "../../store/slices/userReducer";
import {ViewIcon, ViewOffIcon} from "@chakra-ui/icons";
import facebook from "../../assets/facebookblue.svg";
import apple from "../../assets/apple.svg";
import google from "../../assets/google.svg";

type ModalType = {
    buttonValue?: string
}

const LoginModal: React.FC<ModalType> = ({buttonValue = "Login"}) => {
    const {isAuth} = useAppSelector(state => state.user);

    const navigate = useNavigate();

    const dispatch = useAppDispatch();

    const {isOpen, onOpen, onClose} = useDisclosure()

    const initialRef = React.useRef(null)
    const finalRef = React.useRef(null)

    const {
        register,
        handleSubmit,
        formState: {errors, isValid}
    } = useForm({
        defaultValues: {
            email: "",
            password: ""
        },
        mode: "onChange"
    });

    const [show, setShow] = useState(false)

    const handleClick = () => setShow(!show)

    const onSubmit = async (values: any) => {
        await dispatch(loginTC(values));
        onClose()
    };

    if (isAuth) {
        navigate("/");
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
                            <FormControl isInvalid={!!errors.email && !!errors.password}>
                                <FormLabel>Email</FormLabel>
                                <Input mb={3}
                                       variant="filled"
                                       {...register("email", {
                                           required: "Enter email",
                                       })}
                                       placeholder="E-Mail"
                                />
                                <FormErrorMessage>
                                    {errors.email && errors.email.message}
                                </FormErrorMessage>
                            </FormControl>

                            <FormControl isInvalid={!!errors.email && !!errors.password}>
                                <FormLabel>Password</FormLabel>
                                <InputGroup>
                                    <Input
                                        variant="filled"
                                        {...register("password", {required: "Enter password"})}
                                        placeholder="Password"
                                        type={show ? "text" : "password"}
                                    />
                                    <InputRightElement width='4.5rem'>
                                        <Button h='1.75rem' size='sm' onClick={handleClick}>
                                            {show ? <ViewOffIcon/> : <ViewIcon/>}
                                        </Button>
                                    </InputRightElement>
                                </InputGroup>
                                <FormErrorMessage>
                                    {errors.password && errors.password.message}
                                </FormErrorMessage>
                                <Button isLoading={false} fontSize={25} variant="solid" m={"10% 0"}
                                        w="100%" alignSelf="center" type="submit"
                                        disabled={!isValid}>
                                    Login
                                </Button>
                            </FormControl>

                            <Flex align="center" justify="space-around" color={"red.500"} fontSize={15}>
                                <NavLink to={"#"}>Forgot password?</NavLink>
                                <NavLink to={"#"}>Forgot username?</NavLink>
                            </Flex>

                            <Flex alignSelf={"center"} align="center" justify="center">
                                <hr style={{width: "40%"}}/>
                                <Text mx={3} fontSize={17}>or</Text>
                                <hr style={{width: "40%"}}/>
                            </Flex>

                            <Button leftIcon={<Image src={facebook} alt={facebook}/>} _hover={{bg: 'red.100'}}
                                    fontSize={20}
                                    variant="outline" mb={3} w="100%"
                                    alignSelf="center">
                                Continue with Facebook
                            </Button>

                            <Button leftIcon={<Image src={apple} alt={facebook}/>} _hover={{bg: 'red.100'}}
                                    fontSize={20}
                                    variant="outline" mb={3} w="100%" alignSelf="center">
                                Continue with Apple
                            </Button>

                            <Button leftIcon={<Image src={google} alt={facebook}/>} _hover={{bg: 'red.100'}}
                                    fontSize={20}
                                    variant="outline" m={0} w="100%" alignSelf="center">
                                Continue with Google
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

export default LoginModal