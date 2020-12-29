import { Box, createStyles, makeStyles, NoSsr, Typography, useTheme } from "@material-ui/core";
import React, { useContext, useLayoutEffect, useState } from "react"

import DarkModeContext from "./DarkModeContext";
import Footer from "./Footer";
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore';
import { useHotkeys } from 'react-hotkeys-hook';
import IconButtonWithTooltip from "./IconButtonWithTooltip"

const useStyles = makeStyles((theme) => createStyles({
    root: {
        marginTop: theme.spacing(8),
        width: "100%",
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
    footer: {
        position: "absolute",
        left: "1rem",
        bottom: "1rem",
        width: "40%"
    },
    slideIndex: {
        verticalAlign: "middle"
    }
}));

function PresentationNoSsr(props: { children: JSX.Element | JSX.Element[] }) {
    const { children } = props
    const theme = useTheme();
    const { darkMode } = useContext(DarkModeContext)
    const classes = useStyles()
    const [index, setIndex] = useState(0);
    const [] = useState(true)

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
    const backgroundColor = darkMode === "dark" ? "#000" : "#fff"

    // split children in pages
    const slides: {
        content: JSX.Element[];
        note?: JSX.Element[];
    }[] = [];
    const arrayChildren: JSX.Element[] = !children ? [] : Array.isArray(children) ? children : [children];
    arrayChildren.forEach(child => {
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
    const handlePreviousSlide = async () => {
        if (index == 0) return;
        setIndex(Math.max(0, index - 1))
    }
    const handleNextSlide = async () => {
        if (index == slides.length - 1) return;
        setIndex(Math.min(slides.length - 1, index + 1))
    }
    useHotkeys('left', () => { handlePreviousSlide() }, {}, [index])
    useHotkeys('right', () => { handleNextSlide() }, {}, [index])
    const slide = slides[index];
    return <Box mt={theme.spacing(1)} ml={theme.spacing(2)} mr={theme.spacing(2)} className={classes.root} bgcolor={backgroundColor}>
        {slide.content}
        <Box position="absolute" right={theme.spacing(1)} bottom={theme.spacing(2)}>
            <IconButtonWithTooltip title="previous slide (Left)" onClick={handlePreviousSlide}>
                <NavigateBeforeIcon />
            </IconButtonWithTooltip>
            <Typography variant="subtitle1" component="span" className={classes.slideIndex}>
                {index + 1}/{slides.length}
            </Typography>
            <IconButtonWithTooltip title="next slide (Right)" onClick={handleNextSlide}>
                <NavigateNextIcon />
            </IconButtonWithTooltip>
        </Box>
        <div className={classes.footer}>
            <Footer />
        </div>
    </Box>
}

export default function Presentation(props: { children: JSX.Element | JSX.Element[] }) {
    return <NoSsr>
        <PresentationNoSsr {...props} />
    </NoSsr>
}
