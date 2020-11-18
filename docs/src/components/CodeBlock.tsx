import React, { useContext } from 'react'
import Highlight, { defaultProps, Language, PrismTheme } from 'prism-react-renderer'
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import LIGHT_THEME from 'prism-react-renderer/themes/github';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DARK_THEME from 'prism-react-renderer/themes/vsDark';
import DarkModeContext from './DarkModeContext';
import { IconButton, Link } from 'gatsby-theme-material-ui';
import GetAppIcon from '@material-ui/icons/GetApp';

export default function CodeBlock(props: { children: any, className?: string, downloadName?: string; downloadText?: string; }) {
    const { children, className, downloadName, downloadText } = props;
    const { darkMode } = useContext(DarkModeContext)
    const language = className?.replace(/language-/, '') || ""
    const theme = (darkMode === "dark" ? DARK_THEME : LIGHT_THEME) as PrismTheme;
    const valueUri = !!downloadText && `data:application/json;charset=UTF-8,${encodeURIComponent(downloadText)}`

    return (
        <Highlight {...defaultProps}
            code={children}
            language={language as Language}
            theme={theme}
        >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre className={className} style={{ ...style }}>
                    {!!downloadText && <Link style={({ float: "right" })} href={valueUri} download={downloadName || "download"}><IconButton><GetAppIcon /></IconButton></Link>}
                    {tokens.map((line, index) => {
                        const lineProps = getLineProps({ line, key: index })
                        return (
                            <div key={index} {...lineProps}>
                                {line.map((token, key) => (
                                    <span key={key}{...getTokenProps({ token, key })} />
                                ))}
                            </div>
                        )
                    }
                    )}
                </pre>
            )}
        </Highlight>
    )
}