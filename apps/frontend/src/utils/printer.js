export async function printReceipt(text) {
  const isAndroid = /android/i.test(navigator.userAgent);
  
  if (isAndroid) {
    // Jalur Android: Lempar ke aplikasi RawBT
    const encodedText = encodeURIComponent(text);
    // Intent URL untuk Android agar membuka aplikasi RawBT
    const intentUrl = `intent:${encodedText}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dru.a402d.rawbtprinter;end;`;
    
    // Pindah ke URL intent
    window.location.href = intentUrl;
    return true;
  } else {
    // Jalur PC/Laptop: Gunakan sistem Print bawaan browser (window.print)
    // Membuat iframe tak terlihat berisi teks struk
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-9999px';
    document.body.appendChild(printFrame);
    
    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            @media print {
              @page { margin: 0; size: 58mm auto; }
              body { margin: 0; padding: 10px; font-family: monospace; font-size: 12px; width: 58mm; white-space: pre-wrap; word-wrap: break-word; }
            }
            body { font-family: monospace; white-space: pre-wrap; }
          </style>
        </head>
        <body>${text}</body>
      </html>
    `);
    doc.close();
    
    // Tunggu sebentar lalu cetak
    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      // Hapus iframe setelah dialog print muncul
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    }, 250);
    
    return true;
  }
}

