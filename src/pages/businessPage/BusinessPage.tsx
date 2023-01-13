import React, {useEffect} from 'react';
import Avatar from "../../components/avatar/Avatar";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {getSession, getValueFromDBTC} from "../../store/slices/userReducer";

const BusinessPage = () => {
    // const dispatch = useAppDispatch()
    // const {session,value}= useAppSelector(state=>state.user)
    // useEffect(()=>{
    //     if(session.user.id){
    //         const value = {
    //             fromTableName: "profiles",
    //             columnValue: 'id',
    //             columnValueItem: session.user.id,
    //             selectRow: "*"
    //         }
    //         dispatch(getValueFromDBTC(value))
    //     }
    // },[])
    // console.log(value)

    return (
        <div>
{/*<Avatar url={undefined} size={200} onUpload={undefined}/>*/}
        </div>
    );
};

export default BusinessPage;