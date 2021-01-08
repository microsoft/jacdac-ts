import { createElement, FunctionComponent } from "react";
import { SRV_ROLE_MANAGER } from "../../../../src/jdom/constants";
import { JDService } from "../../../../src/jdom/service";
import DashboardRoleManager from "./DashboardRoleManager";
import DashboardService from "./DashboardService";

export interface DashboardServiceProps {
    service: JDService,
    expanded?: boolean
}
export type DashboardServiceComponent = FunctionComponent<DashboardServiceProps>;

const serviceViews: { [serviceClass: number]: DashboardServiceComponent } = {
    [SRV_ROLE_MANAGER]: DashboardRoleManager
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
