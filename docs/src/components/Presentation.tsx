import { Box, CircularProgress, createStyles, Grow, makeStyles, NoSsr, useTheme } from "@material-ui/core";
import React, { useContext, useLayoutEffect, useState } from "react"

import useEffectAsync from "./useEffectAsync"
import DarkModeContext from "./DarkModeContext";

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
    },
}));

function PresentationNoSsr(props: { children: JSX.Element[] }) {
    const { children } = props
    const theme = useTheme();
    const { darkMode } = useContext(DarkModeContext)
    const [spectable, setSpectable] = useState(undefined)
    const classes = useStyles()

    useEffectAsync(async () => {
        const s = await import('spectacle');
        setSpectable(s);
    }, [])
    useLayoutEffect(() => {
        // don't override theme background
        if (browser)
            document.body.style.background = backgroundColor;
        return () => {
            if (browser)
                document.body.style.background = ''
        }
    })

    if (!spectable)
        return <><CircularProgress /></>

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
        <spectable.FlexBox
            justifyContent="space-between"
            position="absolute"
            bottom={0}
            width={1}
        >
            {browser && <spectable.Box padding="0 1em">
                <spectable.FullScreen color={controlColor} size={theme.spacing(5)} />
            </spectable.Box>}
            <spectable.Box padding="1em">
                <spectable.Progress color={controlColor} size={theme.spacing(5)} />
            </spectable.Box>
        </spectable.FlexBox>
    )

    // split children in pages
    const slides: {
        content: JSX.Element[];
        note?: JSX.Element[];
    }[] = [];
    children?.forEach(child => {
        console.log(child.props?.originalType)
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

    // assemble in deck
    return <Box className={classes.root}>
        <spectable.Deck
            theme={deckTheme}
            template={template}
            transitionEffect="slide"
            animationsWhenGoingBack={true}
            backgroundColor={backgroundColor}>
            {slides.map((slide, i) =>
                <spectable.Slide key={i} backgroundColor={backgroundColor}>
                    <spectable.FlexBox height="100%" flexDirection="column">
                        {slide.content.map((el, i) => <Grow in={true} timeout={(1 + i) * 800}>{el}</Grow>)}
                    </spectable.FlexBox>
                    <spectable.Notes>{slide.note || <></>}</spectable.Notes>
                </spectable.Slide>)}
        </spectable.Deck>
    </Box>
}

export default function Presentation(props: { children: JSX.Element[] }) {
    return <NoSsr>
        <PresentationNoSsr {...props} />
    </NoSsr>
}
