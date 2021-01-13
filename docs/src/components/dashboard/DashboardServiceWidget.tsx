import React, { createElement, FunctionComponent, useMemo } from "react";
import { SRV_ACCELEROMETER, SRV_BUTTON, SRV_BUZZER, SRV_GAMEPAD, SRV_LIGHT, SRV_ROLE_MANAGER, SRV_ROTARY_ENCODER, SRV_SERVO, SystemReg } from "../../../../src/jdom/constants";
import { JDService } from "../../../../src/jdom/service";
import DashboardAccelerometer from "./DashboardAccelerometer";
import DashboardBuzzer from "./DashboardBuzzer";
import DashboardLight from "./DashboardLight";
import DashboardRoleManager from "./DashboardRoleManager";
import DashboardGamepad from "./DashbaordGamepad";
import DashboardRotaryEncoder from "./DashboardRotaryEncoder";
import DashboardButton from "./DashboardButton";
import { isRegister } from "../../../../src/jdom/spec";
import RegisterInput from "../RegisterInput";
import DashboardServo from "./DashboardServo";

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
    [SRV_SERVO]: DashboardServo
}

export function addServiceComponent(serviceClass: number, component: DashboardServiceComponent) {
    serviceViews[serviceClass] = component;
}

const collapsedRegisters = [
    SystemReg.Reading,
    SystemReg.Value,
    SystemReg.Intensity
]

function DefaultWidget(props: DashboardServiceProps) {
    const { service, expanded } = props;
    const { specification } = service;
    const register = useMemo(() => {
        const rspec = specification?.packets
            .find(pkt => isRegister(pkt) && collapsedRegisters.indexOf(pkt.identifier) > -1);
        return service.register(rspec.identifier);
    }, [service])

    if (!register) // nothing to see here
        return null;

    return <RegisterInput
            register={register}
            variant={"widget"}
            showServiceName={false}
            showRegisterName={false}
            hideMissingValues={false}
        />;
}

export default function DashboardServiceWidget(props: React.Attributes & DashboardServiceProps): JSX.Element {
    const { service } = props;
    const { specification } = service;
    const component: DashboardServiceComponent = serviceViews[specification.classIdentifier] || DefaultWidget;
    return createElement(component, props);
}
