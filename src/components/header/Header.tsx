import React, {useEffect} from 'react';
import NavComponent from "./NavComponent";
import FilterProductComponent from "./FilterProductComponent";
import {CardHeader} from "@chakra-ui/react";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {getValueFromDBTC} from "../../store/slices/userReducer";

const Header = () => {
    const dispatch = useAppDispatch()
    const isRegister = useAppSelector(state => state.user.isRegister);
    const isUpdate = useAppSelector(state => state.user.isUpdate);
    const {user} = useAppSelector(state => state.user.session);

    useEffect(() => {
        if (user.id) {
            console.log("headerEffect")
            const values = {
                fromTableName: "profiles",
                columnValue: 'id',
                columnValueItem: user.id,
                selectRow: "*"
            }
            dispatch(getValueFromDBTC(values))
        }
    }, [user, isUpdate])
    return (
        <CardHeader height="20vh">
            <NavComponent isRegister={isRegister}/>
            <FilterProductComponent/>
        </CardHeader>
    );
};

export default Header;