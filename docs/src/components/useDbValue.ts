import React, { useContext, useState, useEffect } from "react"
import DbContext from "./DbContext"

export default function useDbValue(id: string, initialValue: string) {
    const { db } = useContext(DbContext)
    const [_value, _setValue] = useState<string>(undefined)
    useEffect(() => {
        db?.getValue(id)
            .then(v => {
                if (v === undefined) {
                    v = initialValue
                    db?.putValue(id, v)
                }
                _setValue(v)
            })
    }, [db])
    return {
        value: _value,
        setValue: (value: string) => {
            db?.putValue(id, value)
                .then(() => _setValue(value))
        }
    }
}

