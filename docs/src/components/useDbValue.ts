import React, { useContext, useState, useEffect } from "react"
import DbContext from "./DbContext"
import useEffectAsync from "./useEffectAsync"

export default function useDbValue(id: string, initialValue: string) {
    const { db } = useContext(DbContext)
    const values = db?.values
    const [_value, _setValue] = useState<string>(undefined)
    useEffectAsync(async () => {
        let v = await values?.get(id)
        if (v === undefined) {
            v = initialValue
            await values?.set(id, v)
        }
        _setValue(v)
    }, [values, db?.dependencyId()])
    return {
        value: _value,
        setValue: async (value: string) => {
            await values?.set(id, value)
        }
    }
}

