import React from "react"
import { isWebUSBSupported } from "../../../src/dom/usb"

export default function WebUSBSupported(props: { children: any }) {
    const { children } = props;
    if (!isWebUSBSupported())
        return <></>
    return { children }
}