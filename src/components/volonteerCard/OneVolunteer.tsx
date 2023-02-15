import React, {useEffect} from 'react';
import {useParams} from "react-router-dom";
import {Flex, Skeleton} from "@chakra-ui/react";
import {useActionCreators, useAppSelector} from "@/hook";
import {ProductsLocation} from "@/components";
import {VolunteerCards} from "@/components/volonteerCard/VolonterCards";
import {anotherUserSelector, volunteersSelector} from "@/store/slices/userSelectors";
import {getAnotherUserTC} from "@/store/slices/userReducer";


const OneVolunteer = () => {
    const volunteer = useAppSelector(anotherUserSelector)
    const actions = useActionCreators({getAnotherUserTC})
    const {id} = useParams();
    useEffect(() => {
        if (id != null) {
            actions.getAnotherUserTC(id)}
        return () => {
            console.log("dead volunteer page")
        }
    }, [id])
    return (
        <Flex direction={{md: "row", base: "column"}} justify={"space-between"} px={7} mt="24vh">
            {!Object.keys(volunteer).length ? <Skeleton height='50px' isLoaded={false}/> :
                <VolunteerCards indicator={"indicator"} volunteer={volunteer}/>
            }
            <ProductsLocation indicator={"indicator"}/>
        </Flex>
    );
};


export default OneVolunteer;