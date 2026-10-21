import ExcelJS from 'exceljs';
import { formatRupiah } from './formatters';

export const exportToExcel = async (transactions, dateLabel) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Riwayat Transaksi');

  worksheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Waktu', key: 'waktu', width: 10 },
    { header: 'ID Transaksi', key: 'id_transaksi', width: 20 },
    { header: 'Kode Barang', key: 'kode_barang', width: 15 },
    { header: 'Nama Barang', key: 'nama_barang', width: 40 },
    { header: 'Jumlah Pembelian', key: 'jumlah_pembelian', width: 18 },
    { header: 'Harga Satuan', key: 'harga_satuan', width: 18 },
    { header: 'Total Harga', key: 'total_harga', width: 20 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD35400' } // Orange theme
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  let grandTotal = 0;
  let rowNo = 1;

  transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    const dateStr = `${String(txDate.getDate()).padStart(2, '0')}/${String(txDate.getMonth() + 1).padStart(2, '0')}/${txDate.getFullYear()}`;
    const timeStr = `${String(txDate.getHours()).padStart(2, '0')}.${String(txDate.getMinutes()).padStart(2, '0')}`;
    
    if (tx.items && tx.items.length > 0) {
      tx.items.forEach(item => {
        const rowTotal = item.qty * item.price;
        worksheet.addRow({
          no: rowNo++,
          tanggal: dateStr,
          waktu: timeStr,
          id_transaksi: tx.id.toUpperCase(),
          kode_barang: item.productId,
          nama_barang: item.productName || item.name,
          jumlah_pembelian: item.qty,
          harga_satuan: item.price,
          total_harga: rowTotal
        });
      });
      grandTotal += tx.total;
    } else {
      // In case there are transactions without items (e.g. old data or manual entry)
      worksheet.addRow({
        no: rowNo++,
        tanggal: dateStr,
        waktu: timeStr,
        id_transaksi: tx.id.toUpperCase(),
        kode_barang: '-',
        nama_barang: '-',
        jumlah_pembelian: '-',
        harga_satuan: '-',
        total_harga: tx.total || 0
      });
      grandTotal += (tx.total || 0);
    }
  });

  worksheet.addRow({}); // Empty row for spacing
  const totalRow = worksheet.addRow({
    nama_barang: 'TOTAL KESELURUHAN',
    total_harga: grandTotal
  });
  
  totalRow.font = { bold: true, size: 12 };
  totalRow.getCell('total_harga').numFmt = '"Rp"#,##0.00'; // Format as Rupiah if needed, or simple number
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `Laporan_Transaksi_${dateLabel.replace(/\s+/g, '_')}.xlsx`;
  a.click();
  
  window.URL.revokeObjectURL(url);
};

export const exportProductsToExcel = async (products, branchName) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data Produk');

  // Helper untuk format tanggal kedaluwarsa M/D/YYYY sesuai format di Excel
  const formatExpDate = (exp) => {
    if (!exp || exp === '-' || exp === 'NULL') return '-';
    try {
      const str = String(exp).split('T')[0];
      const parts = str.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
      }
      const d = new Date(exp);
      if (!isNaN(d.getTime())) {
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      }
    } catch (e) {
      console.error(e);
    }
    return exp;
  };

  // Hitung jumlah batch terbanyak (minimal 2 batch agar sesuai template)
  let maxBatches = 2;
  products.forEach(p => {
    if (p.stocks) {
      p.stocks.forEach(s => {
        if (s.batches && s.batches.length > maxBatches) {
          maxBatches = s.batches.length;
        }
      });
    }
  });

  const totalCols = 5 + maxBatches * 2 + 1; // 5 info cols + (maxBatches * 2) + 1 (Total Produk)

  // Konfigurasi lebar kolom
  const colWidths = [
    6,   // No
    22,  // Barcode
    38,  // Nama Produk
    22,  // Kategori
    26,  // Cabang
  ];
  for (let i = 1; i <= maxBatches; i++) {
    colWidths.push(14); // Jml batch
    colWidths.push(18); // Tgl Kedaluwarsa
  }
  colWidths.push(16); // Total Produk

  worksheet.columns = colWidths.map(w => ({ width: w }));

  // Row 1 & Row 2: Inisialisasi teks header
  const row1 = worksheet.getRow(1);
  const row2 = worksheet.getRow(2);

  row1.getCell(1).value = 'No';
  row1.getCell(2).value = 'Barcode';
  row1.getCell(3).value = 'Nama Produk';
  row1.getCell(4).value = 'Kategori';
  row1.getCell(5).value = 'Cabang';
  row1.getCell(6).value = 'Jumlah (Per Batch)';
  row1.getCell(totalCols).value = 'Total Produk';

  for (let i = 1; i <= maxBatches; i++) {
    const qCol = 5 + (i - 1) * 2 + 1;
    const expCol = qCol + 1;
    row2.getCell(qCol).value = i === 1 ? 'Jml batch 1' : `Batch ${i}`;
    row2.getCell(expCol).value = 'Tgl Kedaluwarsa';
  }

  // Merge Cells untuk Header
  worksheet.mergeCells(1, 1, 2, 1); // No
  worksheet.mergeCells(1, 2, 2, 2); // Barcode
  worksheet.mergeCells(1, 3, 2, 3); // Nama Produk
  worksheet.mergeCells(1, 4, 2, 4); // Kategori
  worksheet.mergeCells(1, 5, 2, 5); // Cabang
  worksheet.mergeCells(1, 6, 1, 5 + maxBatches * 2); // Jumlah (Per Batch)
  worksheet.mergeCells(1, totalCols, 2, totalCols); // Total Produk

  // Styling Header (Green Theme + White text + Center)
  for (let r = 1; r <= 2; r++) {
    const row = worksheet.getRow(r);
    row.height = 24;
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF239B56' } // Hijau Excel
      };
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
      };
    }
  }

  // Helper untuk styling baris data
  const styleDataRow = (row) => {
    row.height = 20;
    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };

      if (c === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (c >= 2 && c <= 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (c === totalCols) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        // Kolom batch: genap = Qty (right), ganjil = Date (center)
        if (c % 2 === 0) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      }
    }
  };

  let rowNo = 1;

  products.forEach(p => {
    // Jika produk belum memiliki stok cabang
    if (!p.stocks || p.stocks.length === 0) {
      const rowData = [
        rowNo++,
        p.barcode || '-',
        p.name,
        p.category || '-',
        '-',
        0,   // Jml batch 1
        '-', // Tgl Kedaluwarsa
      ];
      for (let i = 2; i <= maxBatches; i++) {
        rowData.push('');
        rowData.push('');
      }
      rowData.push(''); // Total Produk kosong

      const row = worksheet.addRow(rowData);
      styleDataRow(row);
      return;
    }

    p.stocks.forEach(stock => {
      const batches = stock.batches || [];
      const totalStockQty = batches.reduce((sum, b) => sum + (Number(b.qty) || 0), 0);

      const rowData = [
        rowNo++,
        p.barcode || '-',
        p.name,
        p.category || '-',
        stock.branchName || '-',
      ];

      if (batches.length === 0) {
        rowData.push(0);
        rowData.push('-');
        for (let i = 2; i <= maxBatches; i++) {
          rowData.push('');
          rowData.push('');
        }
        rowData.push('');
      } else {
        for (let i = 0; i < maxBatches; i++) {
          if (i < batches.length) {
            rowData.push(batches[i].qty);
            rowData.push(formatExpDate(batches[i].expiredDate));
          } else {
            rowData.push('');
            rowData.push('');
          }
        }
        rowData.push(totalStockQty);
      }

      const row = worksheet.addRow(rowData);
      styleDataRow(row);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `Data_Produk_${branchName.replace(/\s+/g, '_')}.xlsx`;
  a.click();
  
  window.URL.revokeObjectURL(url);
};
