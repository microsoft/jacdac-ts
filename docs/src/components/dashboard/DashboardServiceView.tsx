import { createElement, FunctionComponent } from "react";
import { SRV_BUZZER, SRV_LIGHT, SRV_ROLE_MANAGER } from "../../../../src/jdom/constants";
import { JDService } from "../../../../src/jdom/service";
import DashboardBuzzer from "./DashboardBuzzer";
import DashboardLight from "./DashboardLight";
import DashboardRoleManager from "./DashboardRoleManager";
import DashboardService from "./DashboardService";

export interface DashboardServiceProps {
    service: JDService,
    expanded?: boolean
}
export type DashboardServiceComponent = FunctionComponent<DashboardServiceProps>;

const serviceViews: { [serviceClass: number]: DashboardServiceComponent } = {
    [SRV_ROLE_MANAGER]: DashboardRoleManager,
    [SRV_BUZZER]: DashboardBuzzer,
    [SRV_LIGHT]: DashboardLight,
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
