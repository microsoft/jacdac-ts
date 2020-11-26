import { Box, CircularProgress, createStyles, Grow, IconButton, makeStyles, NoSsr, useTheme } from "@material-ui/core";
import React, { useContext, useLayoutEffect, useState } from "react"

import useEffectAsync from "./useEffectAsync"
import DarkModeContext from "./DarkModeContext";
import Footer from "./Footer";
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore';

const useStyles = makeStyles((theme) => createStyles({
    root: {
        fontSize: theme.spacing(6),
        "& h1": {
            fontSize: theme.spacing(9)
        },
        "& h2": {
            fontSize: theme.spacing(9)
        },
        "& h3": {
            fontSize: theme.spacing(8)
        },
        "& h4": {
            fontSize: theme.spacing(7)
        },
        "& h5": {
            fontSize: theme.spacing(6)
        },
        "& h6": {
            fontSize: theme.spacing(6)
        },
        "& footer": {
            position: "absolute",
            bottom: theme.spacing(0.5),
            right: theme.spacing(0.5)
        }
    },
}));

function PresentationNoSsr(props: { children: JSX.Element[] }) {
    const { children } = props
    const theme = useTheme();
    const { darkMode } = useContext(DarkModeContext)
    const classes = useStyles()
    const [index, setIndex] = useState(0);

    useLayoutEffect(() => {
        // don't override theme background
        if (browser)
            document.body.style.background = backgroundColor;
        return () => {
            if (browser)
                document.body.style.background = ''
        }
    })

    const browser = typeof window !== "undefined"
    const controlColor = darkMode === "dark" ? "#fff" : "#000"
    const backgroundColor = darkMode === "dark" ? "#000" : "#fff"
    const deckTheme = {
        colors: {
            primary: theme.palette.text,
            secondary: theme.palette.grey,
        },
        fonts: {
            fontFamily: theme.typography.fontFamily
        },
        space: [16, 24, 32]
    };
    const template = () => (
        <Box justifyContent="space-between"
            position="absolute"
            bottom={0}
            width={1}
        >
            <Box padding="1em">
            </Box>
        </Box>
    )

    // split children in pages
    const slides: {
        content: JSX.Element[];
        note?: JSX.Element[];
    }[] = [];
    children?.forEach(child => {
        if (child.props?.originalType === "h1" || !slides.length)
            slides.push({ content: [] });

        const slide = slides[slides.length - 1]
        if (child.props?.originalType === "hr") {
            slide.note = [];
            return;
        }
        if (slide.note) slide.note.push(child);
        else slide.content.push(child);
    })
    const slide = index !== undefined && slides[index];
    const handlePreviousSlide = () => {
        setIndex(undefined);
        setTimeout(() => setIndex(Math.max(0, index - 1)), 100)
    }
    const handleNextSlide = async () => {
        setIndex(undefined);
        setTimeout(() => setIndex(Math.min(slides.length - 1, index + 1)), 100)
    }
    // assemble in deck
    return <Box m={theme.spacing(1)} className={classes.root} bgcolor={backgroundColor}>
        {slide?.content?.map((el, i) => <Grow key={i} in={true} timeout={(1 + i) * 800}>{el}</Grow>)}
        <Box position="absolute" right={theme.spacing(1)} bottom={theme.spacing(2)}>
            <IconButton onClick={handlePreviousSlide}>
                <NavigateBeforeIcon />
            </IconButton>
            <IconButton onClick={handleNextSlide}>
                <NavigateNextIcon />
            </IconButton>
        </Box>
    </Box>
}

export default function Presentation(props: { children: JSX.Element[] }) {
    return <NoSsr>
        <PresentationNoSsr {...props} />
    </NoSsr>
}
