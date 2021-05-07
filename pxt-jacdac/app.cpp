#include "pxt.h"
#include "jdlow.h"
#include "mbbridge.h"

#define FRAME_EXT_FLAG 0x80

#define LOG(msg, ...) DMESG("JDAPP: " msg, ##__VA_ARGS__)
//#define LOG(...) ((void)0)

#define DEVICE_ID DEVICE_ID_JACDAC

#define EVT_DATA_READY 1
#define EVT_QUEUE_ANNOUNCE 100
#define EVT_TX_EMPTY 101

namespace jacdac {

#define MAX_RX 10
#define MAX_TX 10

static LinkedFrame *volatile rxQ;
static LinkedFrame *volatile txQ;
static LinkedFrame *superFrameRX;

extern "C" jd_frame_t *app_pull_frame() {
    target_disable_irq();
    jd_frame_t *res = NULL;
    if (txQ) {
        res = &txQ->frame;
        txQ = txQ->next;
    }
    target_enable_irq();
    return res;
}

static void queue_cnt() {
    if (txQ == NULL)
        Event(DEVICE_ID, EVT_TX_EMPTY);
}

extern "C" void app_queue_annouce() {
    //    LOG("announce");
    queue_cnt();
    Event(DEVICE_ID, EVT_QUEUE_ANNOUNCE);
}

int copyAndAppend(LinkedFrame *volatile *q, jd_frame_t *frame, int max, uint8_t *data) {
    auto buf = (LinkedFrame *)malloc(JD_FRAME_SIZE(frame) + LINKED_FRAME_HEADER_SIZE);

    buf->timestamp_ms = current_time_ms();

    if (data) {
        memcpy(&buf->frame, frame, JD_SERIAL_FULL_HEADER_SIZE);
        memcpy(&buf->frame.data[4], data, JD_FRAME_SIZE(frame) - JD_SERIAL_FULL_HEADER_SIZE);
        jd_compute_crc(&buf->frame);
        frame->crc = buf->frame.crc;
    } else {
        memcpy(&buf->frame, frame, JD_FRAME_SIZE(frame));
    }

    target_disable_irq();
    auto last = *q;
    int num = 0;
    buf->next = NULL;
    while (last && last->next) {
        last = last->next;
        num++;
    }
    if (num < max) {
        if (last)
            last->next = buf;
        else
            *q = buf;
        buf = NULL;
    }
    target_enable_irq();

    if (buf == NULL) {
        return 0;
    } else {
        free(buf);
        return -1;
    }
}

extern "C" int app_handle_frame(jd_frame_t *frame) {
    // DMESG("PKT t:%d fl:%x %d cmd=%x", (int)current_time_ms(), frame->flags,
    //      ((jd_packet_t *)frame)->service_number, ((jd_packet_t *)frame)->service_command);

    if (copyAndAppend(&rxQ, frame, MAX_RX) < 0) {
        return -1;
    } else {
        Event(DEVICE_ID, EVT_DATA_READY);
        return 0;
    }
}

extern "C" void app_frame_sent(jd_frame_t *frame) {
    // LOG("frame sent");
    free((uint8_t *)frame - LINKED_FRAME_HEADER_SIZE);
    if (txQ)
        jd_packet_ready();
    queue_cnt();
}

//%
int __physId() {
    return DEVICE_ID;
}

static bool isFloodPingReport(jd_packet_t *pkt) {
    return !(pkt->flags & JD_FRAME_FLAG_COMMAND) && pkt->service_number == 0 &&
           pkt->service_command == 0x83;
}

//%
void __physSendPacket(Buffer header, Buffer data) {
    if (!header || header->length != JD_SERIAL_FULL_HEADER_SIZE)
        jd_panic();

    jd_frame_t *frame = (jd_frame_t *)header->data;
    frame->size = (data->length + 4 + 3) & ~3;

    if (copyAndAppend(&txQ, frame, MAX_TX, data->data) < 0)
        return;

    if (pxt::logJDFrame && !isFloodPingReport((jd_packet_t *)header->data)) {
        auto buf = (uint8_t *)malloc(JD_FRAME_SIZE(frame));
        memcpy(buf, frame, JD_SERIAL_FULL_HEADER_SIZE);
        memcpy(buf + JD_SERIAL_FULL_HEADER_SIZE, data->data,
               JD_FRAME_SIZE(frame) - JD_SERIAL_FULL_HEADER_SIZE);
        pxt::logJDFrame(buf);
        free(buf);
    }

    jd_packet_ready();
    // DMESG("s3:%d", (int)current_time_ms());
}

//%
int __physGetTimestamp() {
    if (!superFrameRX)
        return 0;
    return superFrameRX->timestamp_ms;
}

//%
Buffer __physGetPacket() {
    if (superFrameRX && jd_shift_frame(&superFrameRX->frame) == 0) {
        free(superFrameRX);
        superFrameRX = NULL;
    }

    if (!superFrameRX && rxQ) {
        target_disable_irq();
        if ((superFrameRX = rxQ) != NULL)
            rxQ = rxQ->next;
        target_enable_irq();
        if (pxt::logJDFrame && !(superFrameRX->frame.flags & FRAME_EXT_FLAG) &&
            !isFloodPingReport((jd_packet_t *)&superFrameRX->frame))
            pxt::logJDFrame((uint8_t *)&superFrameRX->frame);
    }

    if (!superFrameRX)
        return NULL;

    auto pkt = (jd_packet_t *)&superFrameRX->frame;
    return mkBuffer(pkt, JD_SERIAL_FULL_HEADER_SIZE + pkt->service_size);
}

//%
bool __physIsRunning() {
    return jd_is_running() != 0;
}

static void sendExtFrame(const uint8_t *data) {
    jd_frame_t *frame = (jd_frame_t *)data;
    frame->flags |= FRAME_EXT_FLAG; // set flag saying the frame came from USB
    app_handle_frame(frame);        // pretend we got it from the wire
    frame->flags &= ~FRAME_EXT_FLAG;
    copyAndAppend(&txQ, frame, MAX_TX); // and also put it on the send Q
    jd_packet_ready();
}

//%
void __physStart() {
    jd_init();
    sendJDFrame = sendExtFrame;
#ifdef MICROBIT_CODAL
    mbbridge_init();
#endif
}

//%
Buffer __physGetDiagnostics() {
    if (!jd_is_running())
        return NULL;
    return mkBuffer(jd_get_diagnostics(), sizeof(jd_diagnostics_t));
}

} // namespace jacdac