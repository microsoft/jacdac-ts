import React, { useContext, useState, useEffect } from "react"
import { useChangeAsync } from "../jacdac/useChange"
import DbContext from "./DbContext"
import useEffectAsync from "./useEffectAsync"

export default function useDbValue(id: string, initialValue: string) {
    const { db } = useContext(DbContext)
    const values = db?.values
    const _value = useChangeAsync(values, v => v?.get(id))
    return {
        value: _value || initialValue,
        setValue: async (value: string) => {
            await values?.set(id, value)
        }
    }
}

