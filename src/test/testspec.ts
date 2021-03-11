// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../jacdac-spec/spectool/jdspec.d.ts" />
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../jacdac-spec/spectool/jdtest.d.ts" />

import serviceTestData from "../../jacdac-spec/dist/services-tests.json"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _serviceTests: jdtest.ServiceTestSpec[] = serviceTestData as any

/**
 * Given a service specification, see if it has a test
 * @param spec
 */
export function serviceTestFromServiceClass(
    serviceClass: number
): jdtest.ServiceTestSpec {
    return (
        serviceClass !== undefined &&
        _serviceTests.find(test => test.serviceClassIdentifier === serviceClass)
    )
}
