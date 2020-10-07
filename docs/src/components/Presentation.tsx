import React from "react"
import {
    Box,
    Deck,
    FlexBox,
    FullScreen,
    Notes,
    Progress,
    Slide,
} from 'spectacle';

// SPECTACLE_CLI_THEME_START
const deckTheme = {
    fonts: {
    }
};

const template = () => (
    <FlexBox
        justifyContent="space-between"
        position="absolute"
        bottom={0}
        width={1}
    >
        <Box padding="0 1em">
            <FullScreen color="primary" size={1} />
        </Box>
        <Box padding="1em">
            <Progress color="primary" size={1} />
        </Box>
    </FlexBox>
);

export default function Presentation(props: { children: JSX.Element[] }) {
    const { children } = props

    // split children
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

    console.log('mdx slides', children, slides)
    return <Deck theme={deckTheme} template={template} transitionEffect="slide">
        {slides.map((slide, i) =>
            <Slide key={i}>
                <FlexBox height="100%" flexDirection="column">
                    {slide.content}
                </FlexBox>
                {slide.note && <Notes>{slide.note}</Notes>}
            </Slide>)}
    </Deck>
}