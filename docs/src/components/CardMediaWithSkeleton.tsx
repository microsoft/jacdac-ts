import { CardMedia, CardMediaProps } from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import React from "react";

export default function CardMediaWithSkeleton(props: CardMediaProps) {
    const { image, src, className } = props;
    const hasImage = !!image || !!src;
    return hasImage ? <CardMedia {...props} /> : <Skeleton variant="rect" className={className} />
}