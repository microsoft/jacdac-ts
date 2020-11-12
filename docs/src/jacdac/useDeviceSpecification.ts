import { CtrlReg, SRV_CTRL } from "../../../src/jdom/constants";
import { JDDevice } from "../../../src/jdom/device";
import { deviceSpecificationFromFirmwareIdentifier, imageDeviceOf } from "../../../src/jdom/spec";
import { useRegisterIntValue } from "./useRegisterValue";

export default function useDeviceSpecification(device: JDDevice) {
    const firmwareIdentifierRegister = device?.service(0)?.register(CtrlReg.FirmwareIdentifier);
    const firmwareIdentifier = useRegisterIntValue(firmwareIdentifierRegister);
    const specification = deviceSpecificationFromFirmwareIdentifier(firmwareIdentifier);
    const imageUrl = imageDeviceOf(specification);
    return { specification, imageUrl };
}