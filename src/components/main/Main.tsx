import React from 'react';
import {styled} from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import {supabase} from "../../supaBase.config";
import {Button} from "@mui/material";

const Item = styled(Paper)(({theme}) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));

export default function Main() {
    async function getCities() {
        const countries = await supabase.from('subway_stations').insert({

            name: "testmogilev",
            created_at: new Date,

        })
        console.log(countries)
    }
    async function getCity() {
        const countries = await supabase.from('subway_stations').select("*")
        console.log(countries)
    }


    return (
        <Box sx={{flexGrow: 1, height: "70%"}}>
            <Grid container spacing={3} sx={{margin: "0", width: "98%"}}>
                <Grid item xs={4}>
                    <Item>
                        first
                        <Button onClick={() => getCities()}>Test get</Button>
                    </Item>
                </Grid>
                <Grid item xs={4}>
                    <Item>xs=4</Item>
                </Grid>
                <Grid item xs={4}>
                    <Item>xs=4</Item>
                </Grid>
                <Grid item xs={4}>
                    <Item>xs=4</Item>
                </Grid>
            </Grid>
        </Box>
    );
}