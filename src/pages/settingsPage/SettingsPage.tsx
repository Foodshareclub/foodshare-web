import React from 'react';
import {Box, SimpleGrid} from "@chakra-ui/react";
import {ListingPersonCards, SettingsCard} from "@/components";
import {useGridSize} from "@/hook";
import {settingsInfoArray} from "@/utils";


export const SettingsPage = () => {
    const gridSize = useGridSize();

    return (
        <Box mt="20vh">
            <Box>
                <ListingPersonCards settings={"settings"}
                />
            </Box>
            <SimpleGrid px={{xl:20,base:7}} py={7}
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










