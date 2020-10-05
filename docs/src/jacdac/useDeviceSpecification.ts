import { CtrlReg, SRV_CTRL } from "../../../src/dom/constants";
import { JDDevice } from "../../../src/dom/device";
import { deviceSpecificationFromClassIdenfitier, imageDeviceOf } from "../../../src/dom/spec";
import useRegisterValue from "../jacdac/useRegisterValue";

export default function useDeviceSpecification(device: JDDevice) {
    const deviceClass = device && useRegisterValue(device, SRV_CTRL, CtrlReg.DeviceClass);
    const specification = deviceSpecificationFromClassIdenfitier(deviceClass?.intValue);
    const imageUrl = imageDeviceOf(specification);
    return { specification, imageUrl };
}