export async function printToBluetooth(text) {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth API tidak didukung di browser ini. Gunakan Chrome atau Edge terbaru, dan pastikan koneksi HTTPS.');
  }

  try {
    // Meminta akses ke perangkat Bluetooth
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard BLE Printer
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Goojprt / Poiner
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
        '0000ff00-0000-1000-8000-00805f9b34fb'  // Generic FF00
      ]
    });

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    
    let writeCharacteristic = null;

    // Cari characteristic yang bisa di-write
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeCharacteristic = char;
          break;
        }
      }
      if (writeCharacteristic) break;
    }

    if (!writeCharacteristic) {
      throw new Error('Tidak dapat menemukan fitur cetak pada perangkat ini. Mungkin printer ini tidak didukung.');
    }

    // Persiapkan perintah cetak (ESC/POS)
    const encoder = new TextEncoder();
    const initCmd = new Uint8Array([0x1B, 0x40]); // Reset printer
    const textBytes = encoder.encode(text);
    const endCmd = new Uint8Array([0x0A, 0x0A, 0x0A]); // Feed 3 baris
    
    // Gabungkan array
    const fullData = new Uint8Array(initCmd.length + textBytes.length + endCmd.length);
    fullData.set(initCmd, 0);
    fullData.set(textBytes, initCmd.length);
    fullData.set(endCmd, initCmd.length + textBytes.length);

    // Kirim data secara bertahap (chunking max 256 bytes) untuk mencegah buffer overflow di printer BLE
    const chunkSize = 256;
    for (let i = 0; i < fullData.length; i += chunkSize) {
      const chunk = fullData.slice(i, i + chunkSize);
      if (writeCharacteristic.properties.writeWithoutResponse) {
        await writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await writeCharacteristic.writeValue(chunk);
      }
      // Beri jeda kecil agar printer tidak hang
      await new Promise(r => setTimeout(r, 50));
    }

    device.gatt.disconnect();
    return true;
  } catch (err) {
    console.error('Bluetooth Print Error:', err);
    throw err;
  }
}
