import React, {ChangeEvent} from 'react';
import {useActionCreators, useAppSelector} from "../../hook/hooks";
import {userActions} from "../../store/slices/userReducer";


const LanguageSelector = () => {
    const language = useAppSelector(state => state.user.language);
    const actions = useActionCreators(userActions)

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
        actions.changeLanguage(event.currentTarget.value)
    };

    return (
        <select value={language} onChange={handleChange}>
            <option value="en">English</option>
            <option value="ru">Russian</option>
            <option value="cs">Czech</option>
            <option value="fr">France</option>
        </select>
    );
}

export default LanguageSelector;