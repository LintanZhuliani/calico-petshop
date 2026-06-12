const ExcelJS = require('exceljs');
const fs = require('fs');

async function downloadAndParse() {
  const fileId = '1OXuhrK-d9XYV3cxrflFsdaFOgo314QtZ';
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  
  console.log('Downloading...', url);
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync('Database.xlsx', Buffer.from(buffer));
  console.log('Downloaded. Parsing...');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  const items = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // Print headers
      const headers = [];
      row.eachCell({ includeEmpty: true }, (cell, c) => {
        headers[c] = cell.value;
      });
      console.log('Headers:', headers);
    } else {
      const item = {};
      row.eachCell({ includeEmpty: true }, (cell, c) => {
        item[c] = cell.value;
      });
      items.push(item);
    }
  });
  
  console.log(`Parsed ${items.length} rows.`);
  if (items.length > 0) {
    console.log('First row example:', items[0]);
  }
  
  // Save JSON for seeding
  fs.writeFileSync('products_data.json', JSON.stringify(items, null, 2));
}

downloadAndParse().catch(console.error);
