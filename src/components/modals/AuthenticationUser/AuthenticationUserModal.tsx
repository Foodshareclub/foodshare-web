import {
    Button,
    Flex,
    Image,
    MenuItem,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Text,
    useDisclosure
} from "@chakra-ui/react";
import React, {useState} from "react";
import {useAppDispatch, useAppSelector} from "../../../hook/hooks";
import {NavLink, useNavigate} from "react-router-dom";
import {useForm} from "react-hook-form";
import facebook from "../../../assets/facebookblue.svg";
import apple from "../../../assets/apple.svg";
import google from "../../../assets/google.svg";
import envelope from "../../../assets/envelope-small.png";
import phone from "../../../assets/phone.png";
import {CredentialsBlock} from "./CredentialsBlock";
import {EmailArea} from "./EmailArea";
import {PhoneArea} from "./PhoneArea";

type ModalType = {
    buttonValue: StartWithType
    thunk: any
}

type StartWithType = 'Start' | 'Login' | 'Registration';

const AuthenticationUserModal: React.FC<ModalType> = ({buttonValue, thunk}) => {
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

    const [show, setShow] = useState(false);
    const [startWith, setStartWith] = useState<StartWithType>('Start');

    const handleClick = () => setShow(!show)

    const onSubmit = async (values: { email: string, password: string }) => {
        await dispatch(thunk(values));
        onClose();
    };

    const continueWithEmail = (value: StartWithType) => setStartWith(value);

    const onCloseModalHandler = () => {
        onClose();
        setStartWith('Start');
    }

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
                onClose={onCloseModalHandler}
            >
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader>Welcome to {buttonValue}</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody pb={6}>

                        <form onSubmit={handleSubmit(onSubmit)}>

                            {
                                startWith === 'Start'
                                    ? <CredentialsBlock
                                        errors={errors}
                                        show={show}
                                        isValid={isValid}
                                        buttonValue={buttonValue}
                                        register={register}
                                        handleClick={handleClick}
                                    />
                                    : <>
                                        {startWith === 'Login' && <EmailArea setStartWith={setStartWith}/>}
                                        {startWith === 'Registration' && <PhoneArea setStartWith={setStartWith}/>}
                                    </>
                            }

                            {
                                buttonValue === 'Login' &&
                                <Flex align="center" justify="space-around" color={"red.500"} fontSize={15}>
                                    <NavLink to={"#"}>Forgot password?</NavLink>

                                </Flex>
                            }

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

                            <Button leftIcon={<Image src={google} alt={google}/>} _hover={{bg: 'red.100'}}
                                    fontSize={20}
                                    variant="outline" m={0} w="100%" alignSelf="center">
                                Continue with Google
                            </Button>

                            <Button
                                leftIcon={<Image src={buttonValue === 'Login' ? envelope : phone} alt={google} boxSize='30px'/>}
                                    _hover={{bg: 'red.100'}}
                                    fontSize={20}
                                    variant="outline" mt={3} w="100%" alignSelf="center"
                                    onClick={() => continueWithEmail(buttonValue)}
                            >
                                Continue with {buttonValue === 'Login' ? 'Email' : 'Phone'}
                            </Button>
                        </form>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    )
}

export default AuthenticationUserModal