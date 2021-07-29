import { JDDevice, JDRegister, JDService } from "../jdom/jacdac-jdom"

// Naming helpers
// This breaks the circular dependencies between eg the ServiceTester and RegisterTester, where
// ServiceTester depends on RegisterTester to instantiate it
// but RegisterTester depends on ServiceTester for its name prefix
export class TestingNamer {
    public static nameOfRegister(register: JDRegister) {
        return `${TestingNamer.nameOfService(register.service)}.${register.name}`
    }

    public static nameOfService(service: JDService) {
        return `${TestingNamer.nameOfDevice(service.device)}.${service.specification.name}`
    }

    public static nameOfDevice(device: JDDevice) {
        return device.shortId
    }
}
