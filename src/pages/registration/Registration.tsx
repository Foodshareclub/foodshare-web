import {useForm} from "react-hook-form";
import {useNavigate} from "react-router-dom";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";


import {AuthPayload} from "../../api/profileAPI";
import {Avatar, Box, Button, FormControl, FormErrorMessage, Input} from "@chakra-ui/react";


export const Registration = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const {registration, isRegister} = useAppSelector(state => state.user);


    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting, isValid}
    } = useForm({
        defaultValues: {
            email: "",
            password: "",
            fullName: ""
        },
        mode: "onChange"
    });
    const onSubmit = async (value: AuthPayload) => {
        console.log(value)
        // const data = await dispatch(registerTC(value));
        // console.log(data)
        // if (!data.payload) {
        //     alert("Не удалось зарегистрироваться...");
        // }
        // if ("token" in data.payload) {
        //   localStorage.setItem("token", data.payload.token);
        // } else {
        //   alert("Не удалось зарегистрироваться...");
        // }
    };
    if (isRegister) {
        navigate("/");
    }
    return (
        <Box w="50%" m="0 auto" textAlign="center" fontSize={25} fontWeight={600}>
            <Box mb={5}>
                Registration
            </Box>

            <Avatar m={"2% 0 5% 0"} sx={{width: 100, height: 100}}/>
            <form onSubmit={handleSubmit(onSubmit)}>
                <FormControl isInvalid={!!errors.fullName}>

                    <Input mb={3}
                           id={"fullName"}
                           variant="filled"
                           {...register("fullName", {
                               required: "Enter name please",
                               minLength: {value: 4, message: 'Minimum length should be 4'},
                           })}
                           placeholder="Full name"
                    />

                    <FormErrorMessage>
                        {errors.fullName && errors.fullName.message}
                    </FormErrorMessage>

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

                    <Input mb={3}
                           variant="filled"
                           {...register("password", {required: "Enter password"})}
                           placeholder="Password"
                    />

                    <FormErrorMessage>
                        {errors.password && errors.password.message}
                    </FormErrorMessage>

                    <Button variant="ghost" m={"5% 0"} w="100%" alignSelf="center" type="submit" disabled={!isValid}>
                        Register
                    </Button>
                </FormControl>
            </form>

        </Box>
    );
};
