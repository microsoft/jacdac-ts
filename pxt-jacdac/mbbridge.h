#ifndef __MBBRIDGE_H
#define __MBBRIDGE_H

#ifdef MICROBIT_CODAL
namespace pxt {
extern void (*logJDFrame)(const uint8_t *data);
extern void (*sendJDFrame)(const uint8_t *data);
} // namespace pxt
namespace jacdac {
void mbbridge_init();
void jdble_init();
} // namespace jacdac
#endif

namespace jacdac {
#define LINKED_FRAME_HEADER_SIZE (sizeof(uint32_t) + sizeof(void *))

struct LinkedFrame {
    LinkedFrame *next;
    uint32_t timestamp_ms;
    jd_frame_t frame;
};

int copyAndAppend(LinkedFrame *volatile *q, jd_frame_t *frame, int max, uint8_t *data = NULL);

} // namespace jacdac

#endif
