import { Avatar, createStyles, makeStyles, Theme } from "@material-ui/core";
import React from "react";
import { JDDevice } from "../../../../src/jdom/device";
import useDeviceSpecification from "../../jacdac/useDeviceSpecification";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    img: {
      marginTop: "58%",
    },
    small: {
      width: theme.spacing(3),
      height: theme.spacing(3),
    },
    large: {
      width: theme.spacing(7),
      height: theme.spacing(7),
    },
  }),
);

export default function DeviceAvatar(props: { device: JDDevice, showMissing?: boolean, size?: "small" | "large" }) {
  const { device, showMissing, size } = props;
  const { specification, imageUrl } = useDeviceSpecification(device);
  const classes = useStyles();
  const sizeClassName = size === "small" ? classes.small : size === "large" ? classes.large : undefined;

  if (!showMissing && (!specification || !imageUrl))
    return null;

  return <Avatar
    className={sizeClassName}
    alt={specification?.name || "Image of the device"}
    src={imageUrl}
    classes={{
      img: classes.img
    }}
    />
}