import {useForm} from "react-hook-form";
import {useNavigate} from "react-router-dom";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {AuthPayload} from "../../api/profileAPI";
import {Avatar, Box, Button, FormControl, FormErrorMessage, Input} from "@chakra-ui/react";
import {registerTC} from "../../store/slices/userReducer";


export const Registration = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const {registration, isRegister} = useAppSelector(state => state.user);
    // console.log("isRegister :" + isRegister)

    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting, isValid}
    } = useForm({
        defaultValues: {
            email: "",
            password: "",
            firstName: "",
            lastName:""
        },
        mode: "onChange"
    });
    const onSubmit = async (value: AuthPayload) => {
         await dispatch(registerTC(value));
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

            <Avatar m="2% 0 5% 0" sx={{width: 100, height: 100}}/>
            <form onSubmit={handleSubmit(onSubmit)}>
                <FormControl isInvalid={!!errors.firstName}>
                    <Input mb={3}
                           variant="filled"
                           {...register("firstName", {
                               required: "Enter name please",
                               minLength: {value: 4, message: 'Minimum length should be 4'},
                           })}
                           placeholder="First Name"
                    />
                    <FormErrorMessage>
                        {errors.firstName && errors.firstName.message}
                    </FormErrorMessage>
                    <Input mb={3}
                           variant="filled"
                           {...register("lastName", {
                               required: "Enter name please",
                               minLength: {value: 4, message: 'Minimum length should be 4'},
                           })}
                           placeholder="Last Name"
                    />
                    <FormErrorMessage>
                        {errors.lastName && errors.lastName.message}
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
