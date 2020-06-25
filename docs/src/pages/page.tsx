import React, { useState } from "react"
import JacdacContext, { ConnectButton } from "../jacdac/context"
import { requestUSBBus } from "../../../src/hf2";

const Page = () => {
  return <JacdacContext.Provider value={ { bus: undefined, connectAsync: () => requestUSBBus() }}>
    <ConnectButton />
  </JacdacContext.Provider>
}

export default Page;