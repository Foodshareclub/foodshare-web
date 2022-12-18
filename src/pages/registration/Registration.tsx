import React from "react";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Avatar from "@mui/material/Avatar";
import {useForm} from "react-hook-form";
import styles from "../login/Login.module.scss";
import {useNavigate} from "react-router-dom";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";

import {CssTextField} from "../../components/textFieldStyle/textFieldStyle";
import {AuthPayload} from "../../api/profileAPI";
import {registerTC} from "../../store/slices/userReducer";


export const Registration = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const {registration, isRegister} = useAppSelector(state => state.user);


    const {
        register,
        handleSubmit,
        setError,
        formState: {errors, isValid}
    } = useForm({
        defaultValues: {
            email: "",
            password: "",
            fullName: ""
        },
        mode: "onChange"
    });
    const onSubmit = async (value: AuthPayload) => {
        const data = await dispatch(registerTC(value));
        console.log(data)
        if (!data.payload) {
            alert("Не удалось зарегистрироваться...");
        }
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
        <Paper classes={{root: styles.root}}>
            <Typography classes={{root: styles.title}} variant="h5">
                Registration
            </Typography>
            <div className={styles.avatar}>
                <Avatar sx={{width: 100, height: 100}}/>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CssTextField
                    variant="filled"
                    error={Boolean(errors.fullName?.message)}
                    helperText={errors.fullName?.message}
                    {...register("fullName", {required: "Enter name"})}
                    className={styles.field}
                    label="Full name"
                    fullWidth
                />
                <CssTextField
                    variant="filled"
                    error={Boolean(errors.email?.message)}
                    helperText={errors.email?.message}
                    {...register("email", {required: "Enter email"})}
                    className={styles.field}
                    label="E-Mail"
                    fullWidth
                />
                <CssTextField
                    variant="filled"
                    error={Boolean(errors.password?.message)}
                    helperText={errors.password?.message}
                    {...register("password", {required: "Enter password"})}
                    className={styles.field}
                    label="Password"
                    fullWidth
                />
                <button type="submit" disabled={!isValid} className={!isValid ? styles.disable : styles.enable}>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    Register
                </button>

            </form>
            {/*{status !== "registration" && status !== "registered" &&*/}
            {/*  <Snackbar open anchorOrigin={{ vertical: "bottom", horizontal: "center" }} message={status} />}*/}
        </Paper>
    );
};
