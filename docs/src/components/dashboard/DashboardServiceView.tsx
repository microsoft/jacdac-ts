import { createElement, FunctionComponent } from "react";
import { SRV_ACCELEROMETER, SRV_BUTTON, SRV_BUZZER, SRV_GAMEPAD, SRV_HUMIDITY, SRV_LIGHT, SRV_ROLE_MANAGER, SRV_ROTARY_ENCODER } from "../../../../src/jdom/constants";
import { JDService } from "../../../../src/jdom/service";
import DashboardAccelerometer from "./DashboardAccelerometer";
import DashboardBuzzer from "./DashboardBuzzer";
import DashboardLight from "./DashboardLight";
import DashboardRoleManager from "./DashboardRoleManager";
import DashboardService from "./DashboardService";
import DashboardGamepad from "./DashbaordGamepad";
import DashboardRotaryEncoder from "./DashboardRotaryEncoder";
import DashboardButton from "./DashboardButton";
import DashboardHumidity from "./DashboardHumidity";

export interface DashboardServiceProps {
    service: JDService,
    expanded?: boolean
}
export type DashboardServiceComponent = FunctionComponent<DashboardServiceProps>;

const serviceViews: { [serviceClass: number]: DashboardServiceComponent } = {
    [SRV_ROLE_MANAGER]: DashboardRoleManager,
    [SRV_BUZZER]: DashboardBuzzer,
    [SRV_LIGHT]: DashboardLight,
    [SRV_ACCELEROMETER]: DashboardAccelerometer,
    [SRV_GAMEPAD]: DashboardGamepad,
    [SRV_ROTARY_ENCODER]: DashboardRotaryEncoder,
    [SRV_BUTTON]: DashboardButton,
    [SRV_HUMIDITY]: DashboardHumidity,
}

export function addServiceComponent(serviceClass: number, component: DashboardServiceComponent) {
    serviceViews[serviceClass] = component;
}

export default function DashboardServiceView(props: React.Attributes & DashboardServiceProps): JSX.Element {
    const { service } = props;
    const { specification } = service;
    const component: DashboardServiceComponent = serviceViews[specification.classIdentifier] || DashboardService;
    return createElement(component, props);
}
