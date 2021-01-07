import { Grid } from "@material-ui/core";
import React from "react";
import MemberInput from "./MemberInput";

export default function MembersInput(props: {
    serviceSpecification: jdspec.ServiceSpec,
    specifications: jdspec.PacketMember[],
    values?: any[],
    setValues?: (values: any[]) => void,
    showDataType?: boolean,
    color?: "primary" | "secondary"
}) {
    const { serviceSpecification, specifications, values, setValues, showDataType, color } = props;
    const setValue = (index: number) => (value: any) => {
        const c = values.slice(0)
        c[index] = value;
        setValues(c)
    }

    return <Grid container spacing={1}>
        {specifications.map((field, fieldi) => {
            const value = values?.[fieldi];
            return <Grid item key={fieldi} xs={12}>
                <MemberInput serviceSpecification={serviceSpecification} specification={field}
                    showDataType={showDataType}
                    value={value} 
                    color={color}
                    setValue={values && setValues && setValue(fieldi)} />
            </Grid>;
        })}
    </Grid>
}
