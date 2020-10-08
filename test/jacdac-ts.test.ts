import { setBus } from "../src/bus"
import { printPacket } from "../src/pretty"
import Packet from "../src/packet";
import { getDevices } from "../src/device";

class TestBus {
  send(p: Packet): Promise<void> {
    console.log(`jd send`, printPacket(p))
    return Promise.resolve();
  }
}

const initBus = () => {
  const bus = new TestBus();
  setBus(bus);
  return bus;
}

describe("dummy test", () => {
  it("empty bus has no devices", () => {
    const bus = initBus();
    const devices = getDevices();
    expect(!devices.length)
  })
})
