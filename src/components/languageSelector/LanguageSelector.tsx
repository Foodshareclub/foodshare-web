import React, {ChangeEvent} from 'react';
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {changeLanguage} from "../../store/slices/userReducer";


const LanguageSelector = () => {
    const language = useAppSelector(state => state.user.language)
       const dispatch = useAppDispatch()
    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
     dispatch(changeLanguage(event.currentTarget.value))
    };

    return (
        <select value={language} onChange={handleChange}>
            <option  value="en">English</option>
            <option value="ru">Russian</option>
            <option value="cs">Czech</option>
            <option value="fr">France</option>
        </select>
           );
}

export default LanguageSelector;