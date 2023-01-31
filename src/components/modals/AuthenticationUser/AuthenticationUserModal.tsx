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
import {useNavigate} from "react-router-dom";
import {useForm} from "react-hook-form";
import {CredentialsBlock, EmailArea, PhoneArea} from "@/components";
import {useAppDispatch, useAppSelector} from "@/hook";
import {ProviderType} from "@/api/profileAPI";
import {AsyncThunk} from "@reduxjs/toolkit";
import {signInWithProviderTC} from "@/store/slices/userReducer";
import facebook from "../../../assets/facebookblue.svg";
import apple from "../../../assets/apple.svg";
import google from "../../../assets/google.svg";
import envelope from "../../../assets/envelope-small.png";
import phone from "../../../assets/phone.png";
import {isAuthSelector} from "@/store/slices/userSelectors";
import {PATH} from "@/utils";

type ModalType = {
    buttonValue: StartWithType
    thunk: AsyncThunk<any, any, any>
    fullScreen: boolean
}

export type StartWithType = 'Start' | 'Login' | 'Registration' | 'RecoveryPass';

const AuthenticationUserModal: React.FC<ModalType> = ({buttonValue, thunk, fullScreen}) => {
    const isAuth = useAppSelector(isAuthSelector);

    const navigate = useNavigate();

    const dispatch = useAppDispatch();

    const {isOpen, onOpen, onClose} = useDisclosure();

    const initialRef = React.useRef(null);
    const finalRef = React.useRef(null);

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


    const showPass = () => setShow(true);
    const hidePass = () => setShow(false);

    const onSubmit = async (values: { email: string, password: string }) => {
        await dispatch(thunk(values));
        onClose();
    };

    const continueWith = (value: StartWithType) => setStartWith(value);

    const onCloseModalHandler = () => {
        onClose();
        setStartWith('Start');
    }

    const forgotPasswordHandler = () => setStartWith('RecoveryPass');

    const onSignInWithProviderHandler = (provider: ProviderType) => dispatch(signInWithProviderTC(provider));

    if (isAuth) {
        navigate(PATH.main);
    }
    return (
        <>
            {fullScreen ?
                <MenuItem onClick={onOpen}>{buttonValue}</MenuItem> :
                <Text cursor={"pointer"} _hover={{color: "red"}} fontSize='3xl' onClick={onOpen}>{buttonValue}</Text>
            }
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
                                        showPass={showPass}
                                        hidePass={hidePass}
                                    />
                                    : <>
                                        {startWith === 'Login' && <EmailArea
                                            setStartWith={setStartWith}
                                            operationType={'Login'}
                                        />}
                                        {startWith === 'RecoveryPass' && <EmailArea
                                            setStartWith={setStartWith}
                                            operationType={'Recovery'}
                                        />}
                                        {startWith === 'Registration' && <PhoneArea setStartWith={setStartWith}/>}
                                    </>
                            }

                            {
                                buttonValue === 'Login' && (startWith !== 'RecoveryPass') &&
                                <Flex align="center" justify="space-around" color={"red.500"} fontSize={15}>
                                    <Text
                                        onClick={forgotPasswordHandler}
                                        cursor='pointer'
                                    >
                                        Forgot password?
                                    </Text>

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
                                    alignSelf="center"
                                    onClick={()=>onSignInWithProviderHandler('facebook')}
                            >
                                Continue with Facebook
                            </Button>

                            <Button leftIcon={<Image src={apple} alt={facebook}/>} _hover={{bg: 'red.100'}}
                                    fontSize={20}
                                    variant="outline" mb={3} w="100%" alignSelf="center"
                                    onClick={()=>onSignInWithProviderHandler('apple')}
                            >
                                Continue with Apple
                            </Button>

                            <Button leftIcon={<Image src={google} alt={google}/>} _hover={{bg: 'red.100'}}
                                    fontSize={20}
                                    variant="outline" m={0} w="100%" alignSelf="center"
                                    onClick={()=>onSignInWithProviderHandler('google')}
                            >
                                Continue with Google
                            </Button>

                            <Button
                                leftIcon={<Image src={buttonValue === 'Login' ? envelope : phone} alt={google}
                                                 boxSize='30px'/>}
                                _hover={{bg: 'red.100'}}
                                fontSize={20}
                                variant="outline" mt={3} w="100%" alignSelf="center"
                                onClick={() => continueWith(buttonValue)}
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