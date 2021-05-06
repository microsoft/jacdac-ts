#include "pxt.h"
#include "jdlow.h"
#include "mbbridge.h"

#ifdef MICROBIT_CODAL

#if CONFIG_ENABLED(DEVICE_BLE) && CONFIG_ENABLED(JACDAC_BLE_TRANSPORT)

#include "JacdacBLE.h"

namespace jacdac {

static JacdacBLE* jdble;

// from device to PC
void jdble_tx(const uint8_t *data) {
    jdble->send((uint8_t *)data, JD_FRAME_SIZE(((jd_frame_t*)data)));
}
// from PC to device.
void jdble_rx(MicroBitEvent) {
    pxt::sendJDFrame((const uint8_t *)(void *)jdble->read().getBytes());
}

void jdble_init() {
    jdble = new JacdacBLE(*uBit.ble);
    uBit.messageBus.listen(DEVICE_ID_JACDAC_BLE, MICROBIT_JACDAC_S_EVT_RX, jdble_rx, MESSAGE_BUS_LISTENER_IMMEDIATE);
    pxt::logJDFrame = jdble_tx;
}

// raw ble implementation using SD APIs, not yet used.
#if 0 

#define SD_PROP_READ           = 0x01,
#define SD_PROP_WRITE_WITHOUT  = 0x02,
#define SD_PROP_WRITE          = 0x04,
#define SD_PROP_NOTIFY         = 0x08,
#define SD_PROP_INDICATE       = 0x10,
#define SD_PROP_SIGNED_WRITES  = 0x20,
#define SD_PROP_BROADCAST      = 0x40,
#define SD_PROP_EXTENDED       = 0x80,
#define SD_PROP_READAUTH       = 0x100,
#define SD_PROP_WRITEAUTH      = 0x200

static const uint8_t base_uuid[ 16] =
{0xf8, 0x53, 0x00, 0x01, 0xa9, 0x7f, 0x49, 0xf5, 0xa5, 0x54, 0x3e, 0x37, 0x3f, 0xbe, 0xa2, 0xd5};

const uint16_t serviceUUID               = 0x0001;
const uint16_t characteristic_uuid[3] = { 0x0002, // tx from device to PC
                               0x0003, // rx from PC to device
                               0x0004 // diagnostics from PHY
                             };

static uint8_t bs_uuid_type = 0;
static uint16_t bs_service_handle = 0;

static uint8_t* tx_buffer = NULL;
static uint8_t* rx_buffer = NULL;
static uint8_t* diag_buffer = NULL;

inline bool is_connected() {
    return ble_conn_state_peripheral_conn_count() > 0;
}

static void logFrame(const uint8_t *data) {
}


static void logq_poke() {
}

static void create_char(uint8_t service_idx, uint8_t* buf, int len, uint32_t props) {
    ble_add_char_params_t params;
    memset(&params, 0, sizeof(params));
    
    params.uuid                 = characteristic_uuid[service_idx];
    params.uuid_type            = bs_uuid_type;
    params.max_len              = len;
    params.init_len             = 1;
    params.p_init_value         = buf;
    params.is_var_len           = max_len != init_len;

    if ( props & SD_PROP_READ)
        params.char_props.read = 1;
    if ( props & SD_PROP_WRITE_WITHOUT)
        params.char_props.write_wo_resp= 1;
    if ( props & SD_PROP_WRITE)
        params.char_props.write= 1;
    if ( props & SD_PROP_NOTIFY)
        params.char_props.notify= 1;
    if ( props & SD_PROP_INDICATE)
        params.char_props.indicate= 1;
    if ( props & SD_PROP_SIGNED_WRITES)
        params.char_props.auth_signed_wr= 1;
    if ( props & SD_PROP_BROADCAST)
        params.char_props.broadcast= 1;
    if ( props & SD_PROP_READAUTH)
        params.is_defered_read = true;
    if ( props & SD_PROP_WRITEAUTH)
        params.is_defered_write = true;

    params.read_access = ( security_req_t) MICROBIT_BLE_SECURITY_MODE;
    params.write_access = ( security_req_t) MICROBIT_BLE_SECURITY_MODE;
    params.cccd_write_access = ( security_req_t) MICROBIT_BLE_SECURITY_MODE;
    params.is_value_user = true; // All values content stored in the application
    
    SD_CHECK(characteristic_add(bs_service_handle, &params, ( ble_gatts_char_handles_t *) charHandles( idx)));
}

void jdble_init() {
    // microbit_panic_timeout(0);
    tx_buffer = (uint8_t *)app_alloc(JACDAC_BLE_BUFFER_SIZE);
    rx_buffer = (uint8_t *)app_alloc(JACDAC_BLE_BUFFER_SIZE);
    diag_buffer = (uint8_t *)app_alloc(sizeof(jd_diagnostics_t));

    // Register the base UUID and create the service.
    ble_uuid128_t uuid128;
    uint8_t bs_uuid_type = 0;
    for ( int i = 0; i < 16; i++)
        uuid128.uuid128[i] = base_uuid[ 15 - i];
    SD_CHECK(sd_ble_uuid_vs_add( &uuid128, &bs_uuid_type));

    ble_uuid_t sUUID;
    sUUID.uuid = serviceUUID;
    sUUID.type = bs_uuid_type;

    SD_CHECK(sd_ble_gatts_service_add( BLE_GATTS_SRVC_TYPE_PRIMARY, &sUUID, &bs_service_handle));

    create_char(0, tx_buffer, JACDAC_BLE_BUFFER_SIZE, SD_PROP_WRITE | SD_PROP_WRITE_WITHOUT);
    create_char(1, rx_buffer, JACDAC_BLE_BUFFER_SIZE, SD_PROP_INDICATE);
    create_char(2, diag_buffer, sizeof(jd_diagnostics_t), SD_PROP_READ | SD_PROP_WRITE);

    uBit.bleManager->servicesChanged();

    pxt::logJDFrame = logFrame;
}

#endif

} // namespace jacdac

#endif
#endif