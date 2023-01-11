import React, {useState} from "react";
import facebook from "../../assets/facebookblue.svg"
import apple from "../../assets/apple.svg"
import google from "../../assets/google.svg"
import {loginTC} from "../../store/slices/userReducer";
import {NavLink, useNavigate} from "react-router-dom";
import {useForm} from "react-hook-form";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormErrorMessage,
    Image,
    Input,
    InputGroup,
    InputRightElement,
    Text,
    useToast
} from "@chakra-ui/react";
import {ViewIcon, ViewOffIcon} from "@chakra-ui/icons";


export const Login = () => {
    const {isAuth, error} = useAppSelector(state => state.user);
    const toast = useToast()
    console.log(error)
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting, isValid}
    } = useForm({
        defaultValues: {
            email: "",
            password: ""
        },
        mode: "onChange"
    });
    const [show, setShow] = useState(false)
    const handleClick = () => setShow(!show)
    const toastHandler = () => {
        error && toast({
            title: error ? 'Listing error.' : "Listing successfully",
            description: error ? "Incorrect login or password." : "We've created your Listing for you.",
            status: error ? 'error' : 'success',
            isClosable: true,
        })
    }
    const onSubmit = async (values: any) => {
        await dispatch(loginTC(values));
    };

    if (isAuth) {
        navigate("/");
    }

    return (
        <Box w="50%" m="0 auto" textAlign="center" fontSize={40} fontWeight={600}>
            <Box mb={5}>
                Welcome to Foodshare
            </Box>
            <form onSubmit={handleSubmit(onSubmit)}>
                <FormControl isInvalid={!!errors.email && !!errors.password}>
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

                <FormControl>
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

                    <Button onClick={() => {
                        toastHandler()
                    }} isLoading={false} fontSize={25} variant="solid" m={"5% 0"}
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

                <Button leftIcon={<Image src={facebook} alt={facebook}/>} _hover={{bg: 'red.100'}} fontSize={20}
                        variant="outline" mb={3} w="100%"
                        alignSelf="center">
                    Continue with Facebook
                </Button>

                <Button leftIcon={<Image src={apple} alt={facebook}/>} _hover={{bg: 'red.100'}} fontSize={20}
                        variant="outline" mb={3} w="100%" alignSelf="center">
                    Continue with Apple
                </Button>

                <Button leftIcon={<Image src={google} alt={facebook}/>} _hover={{bg: 'red.100'}} fontSize={20}
                        variant="outline" m={0} w="100%" alignSelf="center">
                    Continue with Google
                </Button>
            </form>
        </Box>
    );
};
