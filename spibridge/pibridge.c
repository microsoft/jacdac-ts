#include <stdio.h>
#include <unistd.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <fcntl.h>
#include <time.h>
#include <pthread.h>
#include <errno.h>
#include <sys/ioctl.h>
#include <linux/spi/spidev.h>

#include <wiringPi.h>

int spi_fd;

#define SPI_DEV "/dev/spidev0.0"
#define XFER_SIZE 256

#define PIN_TX_READY 24   // RST; G0 is ready for data from Pi
#define PIN_RX_READY 25   // AN; G0 has data for Pi
#define PIN_BRIDGE_RST 27 // nRST of the bridge G0 MCU

uint8_t emptyqueue[XFER_SIZE];
uint8_t txqueue[XFER_SIZE + 4];
uint8_t rxqueue[XFER_SIZE];
int txq_ptr;
pthread_mutex_t sendmut;
pthread_cond_t txfree;

// https://wiki.nicksoft.info/mcu:pic16:crc-16:home
uint16_t jd_crc16(const void *data, uint32_t size) {
  const uint8_t *ptr = (const uint8_t *)data;
  uint16_t crc = 0xffff;
  while (size--) {
    uint8_t data = *ptr++;
    uint8_t x = (crc >> 8) ^ data;
    x ^= x >> 4;
    crc = (crc << 8) ^ (x << 12) ^ (x << 5) ^ x;
  }
  return crc;
}

void warning(const char *msg) { fprintf(stderr, "warning: %s\n", msg); }
void fatal(const char *msg) {
  fprintf(stderr, "fatal error: %s\n", msg);
  exit(3);
}

static void printpkt(int ts, const uint8_t *ptr, int len) {
  printf("%d ", ts);
  for (int i = 0; i < len; ++i) {
    printf("%02x", ptr[i]);
  }
  printf("\n");
}

void xfer(void);

static void queuetx(const uint8_t *ptr, int len) {
  if (len < 12) {
    warning("too short pkt TX");
    return;
  }
  uint16_t crc = jd_crc16(ptr + 2, len - 2);
  if ((ptr[0] | (ptr[1] << 8)) != crc) {
    warning("wrong crc TX");
    return;
  }

  pthread_mutex_lock(&sendmut);
  while (txq_ptr + len > XFER_SIZE)
    pthread_cond_wait(&txfree, &sendmut);
  memcpy(txqueue + txq_ptr, ptr, len);
  txq_ptr += (len + 3) & ~3;
  pthread_mutex_unlock(&sendmut);
  xfer();
}

void xfer() {
  pthread_mutex_lock(&sendmut);
  int sendtx = txq_ptr && digitalRead(PIN_TX_READY);
  if (digitalRead(PIN_RX_READY) || sendtx) {
    struct spi_ioc_transfer spi;
    if (sendtx)
      memset(txqueue + txq_ptr, 0, 4);
    memset(rxqueue, 0, 4);
    memset(&spi, 0, sizeof(spi));
    spi.tx_buf = sendtx ? (unsigned long)txqueue : (unsigned long)emptyqueue;
    int timestamp = millis();
    spi.rx_buf = (unsigned long)rxqueue;
    spi.len = XFER_SIZE;
    spi.delay_usecs = 0;
    spi.speed_hz = 16 * 1000 * 1000;
    spi.bits_per_word = 8;
    int ok = 0;
    for (int i = 0; i < 10; ++i) {
      int r = ioctl(spi_fd, SPI_IOC_MESSAGE(1), &spi);
      if (r < 0) {
        fprintf(stderr, "err=%d %s %d\n", r, strerror(errno), spi_fd);
        warning("ioctl SPI failed");
        delay(1);
      } else {
        ok = 1;
        break;
      }
    }
    if (!ok)
      fatal("IOCTL SPI error");
    uint8_t *frame = rxqueue;
    while (frame < rxqueue + XFER_SIZE) {
      if (frame[2] == 0)
        break;
      int sz = frame[2] + 12;
      if (frame + sz > rxqueue + XFER_SIZE) {
        warning("packet overflow");
        break;
      }
      if (frame[0] == 0xff && frame[1] == 0xff && frame[3] == 0xff) {
        // skip bogus packet
      } else {
        uint16_t crc = jd_crc16(frame + 2, sz - 2);
        if (*(uint16_t *)frame != crc)
          warning("invalid crc");
        printpkt(timestamp, frame, sz);
      }
      sz = (sz + 3) & ~3;
      frame += sz;
    }
    fflush(stdout);
    if (sendtx) {
      txq_ptr = 0;
      pthread_cond_signal(&txfree);
    }
  }
  pthread_mutex_unlock(&sendmut);
}

int hexdig(char c) {
  if ('0' <= c && c <= '9')
    return c - '0';
  c |= 0x20;
  if ('a' <= c && c <= 'f')
    return c - 'a' + 10;
  return -1;
}

int main(void) {
  pthread_mutex_init(&sendmut, NULL);
  pthread_cond_init(&txfree, NULL);

  wiringPiSetupGpio();

  pullUpDnControl(PIN_RX_READY, PUD_DOWN);
  pullUpDnControl(PIN_TX_READY, PUD_DOWN);
  pinMode(PIN_RX_READY, INPUT);
  pinMode(PIN_TX_READY, INPUT);

  pinMode(PIN_BRIDGE_RST, OUTPUT);
  digitalWrite(PIN_BRIDGE_RST, 0);
  delay(10);
  digitalWrite(PIN_BRIDGE_RST, 1);
  pinMode(PIN_BRIDGE_RST, INPUT);

  spi_fd = open(SPI_DEV, O_RDWR);
  if (spi_fd < 0) {
    printf("error opening %s: %s\n", SPI_DEV, strerror(errno));
    return 1;
  }

  // uint8_t spiMode = SPI_NO_CS;
  uint8_t spiMode = 0;
  int r = ioctl(spi_fd, SPI_IOC_WR_MODE, &spiMode);

  wiringPiISR(PIN_TX_READY, INT_EDGE_RISING, xfer);
  wiringPiISR(PIN_RX_READY, INT_EDGE_RISING, xfer);

  fprintf(stderr, "staring... %d\n", r);

  xfer();

  for (;;) {
    uint8_t pkt[XFER_SIZE];
    int ptr = 0;
    for (;;) {
      int c = fgetc(stdin);
      if (c < 0)
        return 0;
      if (c == '\r' || c == '\n')
        break;
      if (c == ' ' || c == '\t')
        continue;
      int high = hexdig(c);
      if (high == -1) {
        warning("invalid character");
        continue;
      }
      int low = hexdig(fgetc(stdin));
      if (low == -1) {
        warning("invalid character #2");
        continue;
      }
      pkt[ptr++] = low | (high << 4);
      if (ptr >= XFER_SIZE - 4) {
        warning("too large pkt");
        break;
      }
    }
    if (ptr)
      queuetx(pkt, ptr);
  }

  return 0;
}
