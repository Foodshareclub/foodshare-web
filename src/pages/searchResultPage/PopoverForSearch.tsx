import {
    color,
    HStack, IconButton,
    Input,
    InputGroup,
    InputLeftElement,
    Popover, PopoverAnchor,
    PopoverArrow,
    PopoverBody,
    PopoverCloseButton,
    PopoverContent,
    PopoverHeader,
    PopoverTrigger,
    Radio,
    RadioGroup,
    Stack, useBoolean
} from "@chakra-ui/react";
import * as React from "react";
import {ChangeEvent, useState} from "react";
import {SearchIcon} from "@chakra-ui/icons";
import {t} from "@lingui/macro";
import {useNavigate} from "react-router-dom";

const PopoverForSearch = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useBoolean()
    const [searchValue, setSearchValue] = useState('');
    const [productType, setProductType] = useState('all');
    const [showSearchParams, setShowSearchParams] = useState(false);

    const onSearchHandler = (e: ChangeEvent<HTMLInputElement>) => setSearchValue(e.currentTarget.value);

    const onFindResultsHandler = async () => {
        if (searchValue) {
            navigate(`/s/${productType}?key_word=${searchValue}`);

            setProductType('all');
            setSearchValue('');
            setShowSearchParams(false);
        }
    }
    return (
        <Popover

            isOpen={isEditing}
            onOpen={setIsEditing.on}
            onClose={setIsEditing.off}
            closeOnBlur={false}
            isLazy
            lazyBehavior='keepMounted'
            placement='bottom'
        >
                <InputGroup alignSelf="center" w={"30%"} alignItems="center" flexDir="column">
                    <PopoverAnchor>
                        <Input

                            // focusBorderColor='#FF2D55'
                            isDisabled={!isEditing}
                            value={searchValue}
                            onChange={onSearchHandler}
                            placeholder={t({
                                id: `msg.Input`,
                                message: `What are we in search of today?`
                            })}
                        />
                    </PopoverAnchor>
                    <PopoverTrigger>
                        {/*<IconButton*/}
                        {/*   variant={"unstyled"}*/}
                        {/*    aria-label='Search database'*/}
                        {/*    icon={<SearchIcon />}*/}
                        {/*    pointerEvents={"stroke"}*/}
                        {/*    children={<SearchIcon*/}
                        {/*        cursor={"pointer"}*/}
                        {/*        color={'red.500'}*/}
                        {/*        onClick={onFindResultsHandler}*/}
                        {/*    />}*/}
                        {/*/>*/}
                    <InputLeftElement
                        pointerEvents={"stroke"}
                        children={<SearchIcon
                            cursor={"pointer"}
                            color={'red.500'}
                            onClick={onFindResultsHandler}
                        />}
                    />

                    </PopoverTrigger>
                </InputGroup>

            <PopoverContent color='white' bg='blue.800' borderColor='blue.800'>
                <PopoverHeader pt={4} fontWeight='bold' border='0'>
                    Choose something
                </PopoverHeader>
                <PopoverArrow/>
                <PopoverCloseButton/>
                <PopoverBody>
                    <RadioGroup
                        onChange={setProductType} value={productType}
                    >
                        <Stack direction='row'>
                            <Radio value='all'>All</Radio>
                            <Radio value='food'>Food</Radio>
                            <Radio value='things'>Things</Radio>
                            <Radio value='borrow'>Borrow</Radio>
                            <Radio value='wanted'>Wanted</Radio>
                        </Stack>
                    </RadioGroup>

                </PopoverBody>

            </PopoverContent>
        </Popover>
    )
}
export default PopoverForSearch