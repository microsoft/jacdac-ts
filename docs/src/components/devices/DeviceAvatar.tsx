import { Avatar, createStyles, makeStyles, Theme } from "@material-ui/core";
import React from "react";
import { VIRTUAL_DEVICE_NODE_NAME } from "../../../../src/jdom/constants";
import { JDDevice } from "../../../../src/jdom/device";
import useDeviceSpecification from "../../jacdac/useDeviceSpecification";
import CmdButton from "../CmdButton";
import useDeviceHost from "../hooks/useDeviceHost";
import KindIcon from "../KindIcon"
import useDeviceStatusLightStyle from "./useDeviceStatusLightStyle";
import Helmet from "react-helmet"

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
  const host = useDeviceHost(device);
  const { className: statusLEDClassName, helmetStyle: statusLEDHelmetStyle } = useDeviceStatusLightStyle(device)

  if (!showMissing && (!host && !imageUrl))
    return null;
  const handleIdentify = async () => {
    await device.identify()
  }
  return <>
    {statusLEDHelmetStyle && <Helmet><style>{statusLEDHelmetStyle}</style></Helmet>}
    <CmdButton
      trackName="device.identify"
      size="small"
      title={`identify ${specification?.name || "device"}`}
      onClick={handleIdentify}
      className={statusLEDClassName}
      icon={host ? <KindIcon kind={VIRTUAL_DEVICE_NODE_NAME} /> : <Avatar
        className={sizeClassName}
        alt={specification?.name || "Image of the device"}
        src={imageUrl}
        classes={{
          img: classes.img
        }}
      />}
    />
  </>
}