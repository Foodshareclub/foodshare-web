import * as React from "react";
import {ChangeEvent, useState} from "react";
import {Input, InputGroup, InputLeftElement, Radio, RadioGroup, Stack} from "@chakra-ui/react";
import {SearchIcon} from "@chakra-ui/icons";
import {t} from "@lingui/macro";
import {useNavigate} from "react-router-dom";

export const SearchField = () => {
    const navigate = useNavigate();

    const [searchValue, setSearchValue] = useState('');
    const [productType, setProductType] = useState('all');
    const [showSearchParams, setShowSearchParams] = useState(false);

    const onSearchHandler = (e: ChangeEvent<HTMLInputElement>) => setSearchValue(e.currentTarget.value);

    const onFindResultsHandler = async () => {
        navigate(`/s/${productType}/?key_word=${searchValue}`)

        setProductType('all');
        setSearchValue('');
        setShowSearchParams(false)
    }

    return (
        <>
            <InputGroup alignSelf="center" w={"30%"} alignItems="center" flexDir="column">
                <InputLeftElement
                    pointerEvents={"stroke"}
                    children={<SearchIcon
                        cursor={showSearchParams ? "pointer" : ""}
                        color={showSearchParams ? 'red.500' : 'gray.300'}
                        onClick={onFindResultsHandler}
                    />}
                />
                <Input
                    // focusBorderColor='#FF2D55'
                       value={searchValue}
                       onChange={onSearchHandler}
                       onFocus={() => setShowSearchParams(true)}

                       placeholder={t({
                           id: `msg.Input`,
                           message: `What are we in search of today?`
                       })}
                />
                {
                    showSearchParams &&
                    <RadioGroup onChange={setProductType} value={productType}>
                        <Stack direction='row'>
                            <Radio value='all'>All</Radio>
                            <Radio value='food'>Food</Radio>
                            <Radio value='things'>Things</Radio>
                            <Radio value='borrow'>Borrow</Radio>
                            <Radio value='wanted'>Wanted</Radio>
                        </Stack>
                    </RadioGroup>
                }
            </InputGroup>
        </>

    )
}