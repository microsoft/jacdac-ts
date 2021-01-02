import React, { Fragment } from "react";

const Page = ({ props, children }) => {
    return <Fragment {...props}>{children}</Fragment>
}

export default Page;