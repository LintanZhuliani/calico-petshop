import ExcelJS from 'exceljs';
import { formatRupiah } from './formatters';

export const exportToExcel = async (transactions, dateLabel) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Riwayat Transaksi');

  worksheet.columns = [
    { header: 'ID Transaksi', key: 'id_transaksi', width: 20 },
    { header: 'Tanggal Transaksi', key: 'tanggal_transaksi', width: 25 },
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

  transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    const dateStr = `${String(txDate.getDate()).padStart(2, '0')}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${txDate.getFullYear()} ${String(txDate.getHours()).padStart(2, '0')}:${String(txDate.getMinutes()).padStart(2, '0')}`;
    
    if (tx.items && tx.items.length > 0) {
      tx.items.forEach(item => {
        const rowTotal = item.qty * item.price;
        worksheet.addRow({
          id_transaksi: tx.id.toUpperCase(),
          tanggal_transaksi: dateStr,
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
        id_transaksi: tx.id.toUpperCase(),
        tanggal_transaksi: dateStr,
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
