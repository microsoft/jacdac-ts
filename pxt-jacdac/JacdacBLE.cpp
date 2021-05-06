#include "pxt.h"
#include "jdlow.h"
#include "mbbridge.h"

#ifdef MICROBIT_CODAL

#include "MicroBitConfig.h"

#if CONFIG_ENABLED(DEVICE_BLE) && CONFIG_ENABLED(JACDAC_BLE_TRANSPORT)

#include "ExternalEvents.h"
#include "JacdacBLE.h"
#include "MicroBitFiber.h"
#include "ErrorNo.h"
#include "NotifyEvents.h"

#define BLE_GATT_EFFECTIVE_MTU      20
#define JD_BLE_HEADER_SIZE          2
#define JD_BLE_DATA_SIZE            (BLE_GATT_EFFECTIVE_MTU - JD_BLE_HEADER_SIZE)
#define JD_BLE_FIRST_CHUNK_FLAG     0x80


const uint8_t  JacdacBLE::base_uuid[ 16] =
{0xf8, 0x53, 0x00, 0x01, 0xa9, 0x7f, 0x49, 0xf5, 0xa5, 0x54, 0x3e, 0x37, 0x3f, 0xbe, 0xa2, 0xd5};
// { 0xd5,0xa2,0xbe,0x3f,0x37,0x3e,0x54,0xa5,0xf5,0x49,0x7f,0xa9,0xf2,0x8a,0x53,0xf8 };

const uint16_t JacdacBLE::serviceUUID               = 0x0001;
const uint16_t JacdacBLE::charUUID[ mbbs_cIdxCOUNT] = { 0x0002, // tx from device to PC
                                                        0x0003, // rx from PC to device
                                                        0x0004 // diagnostics from PHY
                                                      };


/**
 * Constructor for the UARTService.
 * @param _ble an instance of BLEDevice
 * @param rxBufferSize the size of the rxBuffer
 * @param txBufferSize the size of the txBuffer
 *
 * @note defaults to 20
 */
JacdacBLE::JacdacBLE(BLEDevice &_ble, uint8_t rxBufferSize, uint8_t txBufferSize)
{
    txBuffer = (uint8_t *)malloc(JACDAC_BLE_BUFFER_SIZE);
    rxBuffer = (uint8_t *)malloc(JACDAC_BLE_BUFFER_SIZE);
    diagBuffer = (uint8_t *)malloc(sizeof(jd_diagnostics_t));

    rxPointer = rxBuffer;
    txPointer = txBuffer;

    // Register the base UUID and create the service.
    RegisterBaseUUID(base_uuid);
    CreateService(serviceUUID);

    // Create the data structures that represent each of our characteristics in Soft Device.
    CreateCharacteristic( mbbs_cIdxRX, charUUID[ mbbs_cIdxRX],
                          rxBuffer,
                          1, BLE_GATT_EFFECTIVE_MTU,
                          microbit_propWRITE | microbit_propWRITE_WITHOUT);

    CreateCharacteristic( mbbs_cIdxTX, charUUID[ mbbs_cIdxTX],
                          txBuffer,
                          1, BLE_GATT_EFFECTIVE_MTU,
                          microbit_propINDICATE);

    // Create the data structures that represent each of our characteristics in Soft Device.
    CreateCharacteristic(mbbs_cIdxDIAG, charUUID[ mbbs_cIdxDIAG],
                          diagBuffer,
                          1, sizeof(jd_diagnostics_t),
                          microbit_propREAD | microbit_propWRITE );
}


/**
  * Invoked when BLE disconnects.
  */
void JacdacBLE::onDisconnect( const microbit_ble_evt_t *p_ble_evt)
{
}


/**
  * A callback function for whenever a Bluetooth device consumes our TX Buffer
  */
void JacdacBLE::onConfirmation( const microbit_ble_evt_hvc_t *params)
{
}

/**
  * A callback function for whenever a Bluetooth device writes to our RX characteristic.
  */
void JacdacBLE::onDataWritten(const microbit_ble_evt_write_t *params)
{
    if (params->handle == valueHandle(mbbs_cIdxRX))
    {
        uint16_t bytesWritten = params->len;

        if (params->data[0] & JD_BLE_FIRST_CHUNK_FLAG) {
            if (this->rxPointer > this->rxBuffer)
                DMESG("JD_BLE: pkt dropped.");

            this->rxPointer = this->rxBuffer;
            this->rxChunkCounter = params->data[0] & 0x7f; 
        }

        this->rxChunkCounter = (this->rxChunkCounter == 0) ? 0 : this->rxChunkCounter - 1;

        if (params->data[1] != this->rxChunkCounter)
            DMESG("JD_BLE: Data out of order");
        else
        {
            memcpy(this->rxPointer, &params->data[2], bytesWritten - JD_BLE_HEADER_SIZE);
            this->rxPointer += bytesWritten - JD_BLE_HEADER_SIZE;
        }

        if (this->rxChunkCounter == 0)
        {
            MicroBitEvent(DEVICE_ID_JACDAC_BLE, MICROBIT_JACDAC_S_EVT_RX);
            this->rxPointer = this->rxBuffer;
        }
    }

    if (params->handle == valueHandle(mbbs_cIdxDIAG))
    {
        indicateChrValue(mbbs_cIdxDIAG, diagBuffer, sizeof(jd_diagnostics_t));
    }
}

/**
 * Send a Jacdac byte buffer.
 * @param buf pointer to the buffer
 * @param len length of the buffer
 *
 * @return MICROBIT_OK on success or MICROBIT_NO_RESOURCES if tx queue is full
 */
int JacdacBLE::send(uint8_t *buf, int length)
{
    if(length < 1)
        return MICROBIT_INVALID_PARAMETER;

    bool updatesEnabled = indicateChrValueEnabled( mbbs_cIdxTX);

    if( !getConnected() && !updatesEnabled)
        return MICROBIT_NOT_SUPPORTED;
    
    ble_gatts_hvx_params_t hvx_params;
    hvx_params.handle = chars[mbbs_cIdxTX].charHandles()->value;
    hvx_params.type   = BLE_GATT_HVX_INDICATION;
    hvx_params.offset = 0;
    hvx_params.p_len  = 0;
    hvx_params.p_data = NULL;

    int totalChunks = (length / (JD_BLE_DATA_SIZE)) + ((length % (JD_BLE_DATA_SIZE)) != 0);
    int remainingChunks = totalChunks - 1;
    int sent = 0;
    uint8_t temp[BLE_GATT_EFFECTIVE_MTU] = { 0 };

    while(sent < length) {
        uint16_t n = min(JD_BLE_DATA_SIZE, length - sent);
        uint16_t total = n + JD_BLE_HEADER_SIZE;
        temp[0] = (totalChunks & 0x7f);

        if (sent == 0)
            temp[0] |= JD_BLE_FIRST_CHUNK_FLAG;
            
        temp[1] = remainingChunks;

        memcpy(&temp[2], buf + sent, n);

        hvx_params.p_len  = &total;
        hvx_params.p_data = temp;
        if (sd_ble_gatts_hvx(getConnectionHandle(), &hvx_params) == NRF_SUCCESS)
        {
            sent += n;
            remainingChunks = (remainingChunks == 0 ? 0 : remainingChunks - 1);
        }
    }

    return MICROBIT_OK;
}


ManagedBuffer JacdacBLE::read() {
    return ManagedBuffer(rxBuffer, JD_FRAME_SIZE((jd_frame_t *)this->rxBuffer));
}
#endif // DEVICE_BLE
#endif // MICROBIT_CODAL
