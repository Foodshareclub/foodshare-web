import React from "react";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import styles from "./Login.module.scss";
import {loginTC} from "../../store/slices/userReducer";
import {NavLink, useNavigate} from "react-router-dom";
import {useForm} from "react-hook-form";
import {Snackbar} from "@mui/material";
import {CssTextField} from "../../components/textFieldStyle/textFieldStyle";
import {AuthPayload} from "../../api/profileAPI";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";

export const Login = () => {

    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const {isAuth} = useAppSelector(state => state.user);


    const {register, handleSubmit, setError, formState: {errors, isValid}} = useForm({
        defaultValues: {
            email: "", password: ""
        }, mode: "onChange"
    });

    const onSubmit = async (values: AuthPayload) => {
        const data = await dispatch(loginTC(values));
        if (!data.payload) {
            alert("Не удалось авторизироваться...");
        }
        // if (localStorage.getItem("token") || "token" in data.payload) {
        //   window.localStorage.setItem("token", data.payload.token);
        // } else {
        //   alert("Не удалось авторизоваться...");
        // }
    };

    if (isAuth) {
        navigate("/");
    }

    return (
        <>
            {!isAuth &&
                <Snackbar open anchorOrigin={{vertical: "bottom", horizontal: "center"}}
                          // message={"some text"}
                />
            }
            <Paper classes={{root: styles.root}}>
                <Typography classes={{root: styles.title}} variant="h5">
                    Log In
                </Typography>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CssTextField
                        variant="filled"
                        type="email" className={styles.field}
                        label="E-Mail"
                        error={Boolean(errors.email?.message)}
                        helperText={errors.email?.message}
                        {...register("email", {required: "Enter email"})}
                        fullWidth
                    />
                    <CssTextField
                        variant="filled"
                        {...register("password", {required: "Enter password"})}
                        error={Boolean(errors.password?.message)}
                        helperText={errors.password?.message} className={styles.field}
                        label="Password"
                        fullWidth/>

                    <button type="submit" disabled={!isValid} className={!isValid ? styles.disable : styles.enable}>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        Submit
                    </button>

                    <NavLink className={styles.navLink} to="/forgot">Forgot password?</NavLink>
                    <NavLink className={styles.navLink} to="/forgot">Forgot email?</NavLink>
                </form>
            </Paper>
        </>

    );
};
