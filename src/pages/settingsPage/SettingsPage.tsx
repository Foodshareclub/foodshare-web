import React, {useEffect, useState} from 'react';
import {Box, Button, Input, SimpleGrid} from "@chakra-ui/react";
import {ListingPersonCards, SettingsCard} from "@/components";
import {useAppSelector, useGridSize} from "@/hook";
import {avatarURLSelector, userFirstNameSelector, userSecondNameSelector} from "@/store";
import {settingsInfoArray} from "@/utils";
import {supabase} from "@/supaBase.config";
import {RealtimeChannel} from '@supabase/supabase-js';



export const SettingsPage = () => {
    const gridSize = useGridSize();
    const userFirstName = useAppSelector(userFirstNameSelector);
    const userSecondName = useAppSelector(userSecondNameSelector);
    const imgUrl = useAppSelector(avatarURLSelector);

    return (
        <Box mt="20vh">
            <Box>
                <ListingPersonCards
                    userFirstName={userFirstName}
                    userSecondName={userSecondName}
                    imgUrl={imgUrl}
                />
            </Box>
            <SimpleGrid p={8}
                        columns={gridSize}
                        spacing={10}
            >

                {settingsInfoArray.map((card, i) => {
                    return <SettingsCard
                        settingTitle={card.settingTitle}
                        description={card.description}
                        imgSRC={card.img}
                        route={card.route}
                        key={i}
                    />
                })}
            </SimpleGrid>
        </Box>
    );
};










