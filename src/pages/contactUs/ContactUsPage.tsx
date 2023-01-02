import React from 'react';
import {
    Avatar,
    Box,
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    useBreakpointValue
} from "@chakra-ui/react";
import {useForm} from "react-hook-form";
import {AuthPayload} from "../../api/profileAPI";

const ContactUsPage = () => {
    const variant = useBreakpointValue(
        {
            base: 'ghost',
            md: 'solid',
        },
        {
            // Breakpoint to use when mediaqueries cannot be used, such as in server-side rendering
            // (Defaults to 'base')
            fallback: 'md',
        },
    )
    console.log(variant)
    console.log(visualViewport?.width)
    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting, isValid}
    } = useForm({
        defaultValues: {
            email: "",
            phone: "",
            fullName: ""
        },
        mode: "onChange"
    });
    const onSubmit = async (value: AuthPayload) => {
        console.log(value)

    };
    return (
        <Box w="50%" m="0 auto" textAlign="center" fontSize={25} fontWeight={600}>
            <Box mb={5}>
                Contact Us
            </Box>

            <Box fontSize={20} mb={3}>
                Sent us a message
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
                <FormControl isInvalid={!!errors.fullName}>

                    <FormLabel>Full name</FormLabel>

                    <Input mb={3}
                           id={"fullName"}
                           variant="filled"
                           {...register("fullName", {
                               required: "Enter name please",
                               minLength: {value: 4, message: 'Minimum length should be 4'},
                           })}
                           placeholder="Enter..."
                    />

                    <FormErrorMessage>
                        {errors.fullName && errors.fullName.message}
                    </FormErrorMessage>

                    <FormLabel>Email</FormLabel>

                    <Input mb={3}
                           variant="filled"
                           {...register("email", {
                               required: "Enter email",

                           })}
                           placeholder="Enter..."
                    />

                    <FormErrorMessage>
                        {errors.email && errors.email.message}
                    </FormErrorMessage>

                    <FormLabel>Phone</FormLabel>

                    <Input mb={3}
                           variant="filled"
                           {...register("phone", {required: "Enter phone number"})}
                           placeholder="x-xxx-xxx-xxxx"
                    />

                    <FormErrorMessage>
                        {errors.phone && errors.phone.message}
                    </FormErrorMessage>

                    <Button variant={variant} m={"5% 0"} w="100%" alignSelf="center" type="submit" disabled={!isValid}>
                        Send message
                    </Button>
                </FormControl>
            </form>

        </Box>
    );
};

export default ContactUsPage;