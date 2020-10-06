import { CtrlReg, SRV_CTRL } from "../../../src/dom/constants";
import { JDDevice } from "../../../src/dom/device";
import { deviceSpecificationFromClassIdenfitier, imageDeviceOf } from "../../../src/dom/spec";
import { useRegisterIntValue } from "./useRegisterValue";

export default function useDeviceSpecification(device: JDDevice) {
    const deviceClassRegister = device?.service(0).register(CtrlReg.DeviceClass);
    const deviceClass = useRegisterIntValue(deviceClassRegister);
    const specification = deviceSpecificationFromClassIdenfitier(deviceClass);
    const imageUrl = imageDeviceOf(specification);
    return { specification, imageUrl };
}