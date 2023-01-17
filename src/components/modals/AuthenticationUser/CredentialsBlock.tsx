import {FieldErrorsImpl} from "react-hook-form";
import React from "react";
import {Button, FormControl, FormErrorMessage, FormLabel, Input, InputGroup, InputRightElement} from "@chakra-ui/react";
import {ViewIcon, ViewOffIcon} from "@chakra-ui/icons";

type FieldErrorType = Partial<FieldErrorsImpl<{ email: string; password: string; }>>;

type CredentialsBlockType = {
    errors: FieldErrorType
    register: any
    handleClick: () => void
    show: boolean
    isValid: boolean
    buttonValue: string
}

export const CredentialsBlock: React.FC<CredentialsBlockType> = ({
                                                              errors,
                                                              register, handleClick,
                                                              show,
                                                              isValid,
                                                              buttonValue
                                                          }) => {
    return (
        <>
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
                    {buttonValue}
                </Button>
            </FormControl>
        </>
    )
}
