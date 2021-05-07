#ifndef JACDAC_BLE_SERVICE_H
#define JACDAC_BLE_SERVICE_H

#ifdef MICROBIT_CODAL

#include "MicroBitConfig.h"

#if CONFIG_ENABLED(DEVICE_BLE) && CONFIG_ENABLED(JACDAC_BLE_TRANSPORT)

#include "MicroBitBLEManager.h"
#include "MicroBitBLEService.h"
#include "jdlow.h"

#define JACDAC_BLE_BUFFER_SIZE      254

#define MICROBIT_JACDAC_S_EVT_RX    1
#define MICROBIT_JACDAC_S_EVT_TX    1

#define DEVICE_ID_JACDAC_BLE        3056         

#define JD_BLE_STATUS_IN_USE        0x08

/**
  * Class definition for the custom MicroBit UART Service.
  * Provides a BLE service that acts as a UART port, enabling the reception and transmission
  * of an arbitrary number of bytes.
  */
class JacdacBLE : public MicroBitBLEService
{
    uint8_t* rxBuffer;
    uint8_t* txBuffer;
    uint8_t* diagBuffer;
    uint8_t* txPointer;
    uint8_t* rxPointer;

    uint32_t rxCharacteristicHandle;
    uint32_t diagCharacteristicHandle;

    uint8_t status;
    uint8_t rxChunkCounter;

    /**
      * Invoked when BLE disconnects.
      */
    void onDisconnect( const microbit_ble_evt_t *p_ble_evt);

    /**
      * A callback function for whenever a Bluetooth device consumes our TX Buffer
      */
    void onConfirmation( const microbit_ble_evt_hvc_t *params);
    
    
    /**
      * A callback function for whenever a Bluetooth device writes to our TX characteristic.
      */
    void onDataWritten(const microbit_ble_evt_write_t *params);

    public:

    /**
     * Constructor for the JacdacBLE.
     * @param _ble an instance of BLEDevice
     * @param rxBufferSize the size of the rxBuffer
     * @param txBufferSize the size of the txBuffer
     *
     * @note The default size is JACDAC_BLE_BUFFER_SIZE (254 bytes).
     */
    JacdacBLE(BLEDevice &_ble, uint8_t rxBufferSize = JACDAC_BLE_BUFFER_SIZE, uint8_t txBufferSize = JACDAC_BLE_BUFFER_SIZE);

    /**
     * Send a Jacdac byte buffer.
     * @param buf pointer to the buffer
     * @param len length of the buffer
     *
     * @return MICROBIT_OK on success or MICROBIT_NO_RESOURCES if tx queue is full
     */
    int send(uint8_t* buf, int len);

    int send(ManagedBuffer b) 
    {
        return this->send((uint8_t *)b.getBytes(), b.length());
    }

    ManagedBuffer read();
    
    // Index for each charactersitic in arrays of handles and UUIDs
    typedef enum mbbs_cIdx
    {
        mbbs_cIdxTX,
        mbbs_cIdxRX,
        mbbs_cIdxDIAG,
        mbbs_cIdxCOUNT
    } mbbs_cIdx;
    
    // UUIDs for our service and characteristics
    static const uint8_t  base_uuid[16];
    static const uint16_t serviceUUID;
    static const uint16_t charUUID[ mbbs_cIdxCOUNT];
    
    // Data for each characteristic when they are held by Soft Device.
    MicroBitBLEChar      chars[ mbbs_cIdxCOUNT];

    public:
    
    int              characteristicCount()          { return mbbs_cIdxCOUNT; };
    MicroBitBLEChar *characteristicPtr( int idx)    { return &chars[ idx]; };
};

#endif // DEVICE_BLE
#endif // MICROBIT_CODAL
#endif 
