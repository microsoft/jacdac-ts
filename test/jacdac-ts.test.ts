import { setBus } from "../src/jd"
import { printPacket } from "../src/jdpretty"
import { Packet } from "../src/jdpacket";
import { getDevices } from "../src/jddevice";

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
