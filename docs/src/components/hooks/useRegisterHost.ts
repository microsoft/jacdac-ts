import { JDRegister } from "../../../../src/jdom/register";
import JDRegisterHost from "../../../../src/jdom/registerhost";
import useServiceHost from "./useServiceHost";

export default function useRegisterHost(register: JDRegister) {
    const host = useServiceHost(register?.service);
    return host?.register(register?.code);
}