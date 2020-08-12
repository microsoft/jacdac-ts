import React, { Fragment } from "react"
import { serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec"
import { Chip } from "@material-ui/core"

export default function EnumSpecification(props: { serviceClass: number }) {
    const { serviceClass } = props
    const spec = serviceSpecificationFromClassIdentifier(serviceClass)
    const enums = Object.values(spec?.enums || {})
    if (!enums.length)
        return <></>

    return <Fragment>
        <h2>Enums</h2>
        {enums.map(e => <Fragment>
        <h3>{e.name} {e.isFlags && <Chip label="flags" size="small" />}</h3>
            <ul>
                {Object.keys(e.members).map(en => <li>{en}: <code>0x{e.members[en].toString(16)}</code></li>)}
            </ul>
            </Fragment>)}
    </Fragment>
}
