import { GridSize } from "@material-ui/core"
import React, { useContext } from "react"
import DrawerContext, { DrawerType } from "./DrawerContext"

export default function useGridBreakpoints(): {
    xs: GridSize,
    md: GridSize,
    sm: GridSize,
    lg: GridSize,
    xl: GridSize
} {
    const { drawerType } = useContext(DrawerContext)
    if (drawerType != DrawerType.None) return { xs: 12, md: 12, sm: 12, lg: 6, xl: 4 }
    else return {
        xs: 12,
        sm: 6,
        md: 4,
        lg: 4,
        xl: 3
    }
}