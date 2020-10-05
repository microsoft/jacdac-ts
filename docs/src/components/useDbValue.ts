import React, { useContext, useState, useEffect } from "react"
import DbContext, { DB_VALUE_CHANGE } from "./DbContext"
import useEffectAsync from "./useEffectAsync"

export default function useDbValue(id: string, initialValue: string) {
    const { db } = useContext(DbContext)
    const [_value, _setValue] = useState<string>(undefined)
    const values = db?.values
    let _mounted = true;

    // listen to change
    useEffect(() => values?.subscribe(DB_VALUE_CHANGE, async (changed) => {
        if (changed === id) {
            const v = await values.get(id)
            if (_mounted) {
                _setValue(v);
            }
        }
        return () => {
            _mounted = false;
        }
    }), [values])

    // load intial value
    useEffectAsync(async (mounted) => {
        const v = await values?.get(id);
        if (mounted())
           _setValue(v || initialValue)
    })
    return {
        value: _value,
        setValue: async (value: string) => {
            await values?.set(id, value)
        }
    }
}

