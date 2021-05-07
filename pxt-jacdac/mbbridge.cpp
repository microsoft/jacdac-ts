#include "pxt.h"
#include "jdlow.h"
#include "mbbridge.h"

#ifdef MICROBIT_CODAL

namespace pxt {
void (*logJDFrame)(const uint8_t *data);
void (*sendJDFrame)(const uint8_t *data);
uint64_t current_time_us() {
    return system_timer_current_time_us();
}
} // namespace pxt

#if CONFIG_ENABLED(DEVICE_BLE) && CONFIG_ENABLED(JACDAC_BLE_TRANSPORT)
#else
namespace jacdac {

#define MAX_LOGQ 10
static LinkedFrame *volatile logQ;

struct ExchangeBuffer {
    uint8_t magic[8];
    uint8_t irqn;
    uint8_t padding[3];

    // only single buffer in each direction to ensure ordering
    volatile uint8_t recvBuf[256]; // the PC reads from here
    volatile uint8_t sendBuf[256]; // the PC writes here
};

static ExchangeBuffer *buff;

static void logq_poke();

static volatile uint32_t *recvPtr() {
    auto bp = buff->recvBuf;
    if (bp[2])
        bp = NULL;
    return (volatile uint32_t *)bp;
}

static void pushOutData(const jd_frame_t *frame) {
    auto bp = recvPtr();
    if (!bp)
        target_panic(111);
    auto src = (uint32_t *)frame;
    int len = (JD_FRAME_SIZE(frame) + 3) >> 2;
    for (int i = 1; i < len; ++i)
        bp[i] = src[i];
    bp[0] = src[0]; // first word copied last to ensure atomicity
}

// a nice unused interrupt
extern "C" void TEMP_IRQHandler() {
    logq_poke();
}

static void logFrame(const uint8_t *data) {
    auto frame = (jd_frame_t *)(void *)data;
    target_disable_irq();
    if (buff->recvBuf[2] != 0xff) {
        if (logQ || !recvPtr()) {
            copyAndAppend(&logQ, frame, MAX_LOGQ);
        } else {
            pushOutData(frame);
        }
    }
    target_enable_irq();
    logq_poke();
}

static void logq_poke() {
    target_disable_irq();
    if (logQ && recvPtr()) {
        auto tmp = logQ;
        logQ = tmp->next;
        pushOutData(&tmp->frame);
        free(tmp);
    }
    if (buff->sendBuf[2]) {
        pxt::sendJDFrame((const uint8_t *)(void *)buff->sendBuf);
        buff->sendBuf[2] = 0;
    }
    target_enable_irq();
}

void mbbridge_init() {
    // microbit_panic_timeout(0);

    buff = (ExchangeBuffer *)app_alloc(sizeof(*buff));
    memset(buff, 0, sizeof(*buff));
    buff->irqn = TEMP_IRQn;
    memcpy(buff->magic, "JDmx\xe9\xc0\xa6\xb0", 8);
    buff->recvBuf[2] = 0xff; // we'll wait until this is cleared by the computer

    NVIC_ClearPendingIRQ((IRQn_Type)buff->irqn);
    NVIC_EnableIRQ((IRQn_Type)buff->irqn);

    pxt::logJDFrame = logFrame;
}

} // namespace jacdac
#endif
#endif