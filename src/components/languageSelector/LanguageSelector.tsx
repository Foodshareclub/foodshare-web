import React, {ChangeEvent} from 'react';
import {useActionCreators, useAppSelector} from "@/hook";
import {userActions} from "@/store/slices/userReducer";
import {languageSelector} from "@/store/slices/userSelectors";
import {Select} from "@chakra-ui/react";

const LanguageSelector = () => {
    const language = useAppSelector(languageSelector);

    const actions = useActionCreators(userActions);

    const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
        actions.changeLanguage(event.currentTarget.value);
    };

    return (
        <Select w={20} variant='unstyled' size={"xs"} value={language} onChange={handleChange}>
            <option  value="en">English</option>
            <option value="ru">Russian</option>
            <option value="cs">Czech</option>
            <option value="fr">France</option>
        </Select>
    );
}

export default LanguageSelector;