import { Paper, useTheme } from "@material-ui/core";
import React, { useContext, useLayoutEffect } from "react"
import {
    Box,
    Deck,
    FlexBox,
    FullScreen,
    Notes,
    Progress,
    Slide,
} from 'spectacle';
import DarkModeContext from "./DarkModeContext";

export default function Presentation(props: { children: JSX.Element[] }) {
    const { children } = props
    const theme = useTheme();
    const { darkMode } = useContext(DarkModeContext)

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
        <FlexBox
            justifyContent="space-between"
            position="absolute"
            bottom={0}
            width={1}
        >
            <Box padding="0 1em">
                <FullScreen color={controlColor} size={theme.spacing(5)} />
            </Box>
            <Box padding="1em">
                <Progress color={controlColor} size={theme.spacing(5)} />
            </Box>
        </FlexBox>
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

    useLayoutEffect(() => {
        // don't override theme background
        document.body.style.background = backgroundColor;
        return () => document.body.style.background = ''
    })

    // assemble in deck
    return <Deck
        theme={deckTheme}
        template={template}
        transitionEffect="slide"
        animationsWhenGoingBack={true}
        backgroundColor={backgroundColor}>
        {slides.map((slide, i) =>
            <Slide key={i} backgroundColor={backgroundColor}>
                <FlexBox height="100%" flexDirection="column">
                    {slide.content}
                </FlexBox>
                <Notes>{slide.note || <></>}</Notes>
            </Slide>)}
    </Deck>
}