// Dynamic Shane Creative Studio receipt: consistent branding and as many item rows as needed.
// Exports a PNG directly from a canvas; no print-preview page is required.
import { money } from './api';
const loadImage = src => new Promise((resolve, reject) => {

  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});
const C = { purple: '#82398D', dark: '#39133F', lilac: '#E7C9EA', pale: '#FAEFFB', line: '#A368AA', ink: '#23142B' };
function numberWords(value) {

  const ones = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const below1000 = n => n < 20 ? ones[n] : n < 100 ? tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') : ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below1000(n % 100) : '');

  const segments = [];

  let n = Math.floor(Math.max(0, Number(value) || 0));

  for (const [unit, label] of [[1e12, 'Trillion'], [1e9, 'Billion'], [1e6, 'Million'], [1000, 'Thousand'], [1, '']]) {

    const part = Math.floor(n / unit);

    if (part) {

      segments.push(below1000(Math.min(part, 999)) + (label ? ' ' + label : ''));

      n %= unit;

    }

  }

  const cents = Math.round(((Number(value) || 0) % 1) * 100);

  return (segments.join(' ') || 'Zero') + ' Pesos' + (cents ? ' and ' + String(cents).padStart(2, '0') + '/100' : ' Only');
}
export async function renderReceipt(record) {

  const items = Array.isArray(record.items) ? record.items : [];

  const width = 1100, rowH = 51, itemRows = Math.max(5, items.length), extra = (itemRows - 5) * rowH;

  const height = 1430 + extra, canvas = document.createElement('canvas');

  canvas.width = width;

  canvas.height = height;

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'white';

  ctx.fillRect(0, 0, width, height);

  const text = (str, x, y, size = 22, bold = false, color = C.ink, align = 'left', font = 'Arial') => {

    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(String(str ?? ''), x, y);
  };

  const stroke = (x1, y1, x2, y2, col = C.line, thick = 1) => {

    ctx.strokeStyle = col;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const rect = (x, y, w, h, col) => {

    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };

  const rounded = (x, y, w, h, r, col) => {

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };

  const fit = (str, max, size = 22, bold = false) => {

    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial`;
    let value = String(str ?? '');
    while (value.length > 1 && ctx.measureText(value).width > max)
      value = value.slice(0, -2) + '…';
    return value;
  };

  const wrap = (str, max, size = 20) => {

    ctx.font = `${size}px Arial`;
    const result = [];
    let line = '';
    for (const word of String(str || '').split(/\s+/)) {

      const candidate = line ? line + ' ' + word : word;

      if (ctx.measureText(candidate).width > max && line) {

        result.push(line);

        line = word;

      }
      else
        line = candidate;

    }
    if (line)
      result.push(line);
    return result;
  };

  const fmtDate = (val) => {

    if (!val)
      return '—';
    const d = new Date(val);
    return Number.isNaN(+d) ? '—' : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  // Use the customer-provided original full-color SCS logo, rather than a redrawn logo.

  try {

    const logo = await loadImage('/scs-receipt-logo.png');

    const boxX = 48, boxY = 18, boxW = 480, boxH = 358;
    const scale = Math.min(boxW / logo.width, boxH / logo.height);
    const drawW = logo.width * scale;
    const drawH = logo.height * scale;
    const drawX = boxX + (boxW - drawW) / 2;
    const drawY = boxY + (boxH - drawH) / 2;

    ctx.drawImage(logo, drawX, drawY, drawW, drawH);

  }
  catch {

    text('Shane Creative Studio', 50, 142, 35, true, C.purple);

  }

  stroke(557, 75, 557, 347, C.purple, 2);

  const contacts = [['☎', 'No. 09456939550'], ['f', 'FB Page: Shane Creative Studio']];

  contacts.forEach(([icon, label], i) => {

    const y = 100 + i * 62;
    rounded(594, y - 21, 39, 39, 20, C.purple);
    text(icon, 614, y, 22, true, 'white', 'center');
    text(label, 650, y, 22, false, C.ink);
  });

  rounded(594, 202, 39, 39, 20, C.purple);

  text('⌖', 614, 222, 26, true, 'white', 'center');
  // Every address line starts at exactly the same x coordinate.

  text('Address: Aspo Boarding House,', 650, 218, 20);

  text('Maloro, Tangub City,', 650, 248, 20);

  text('Philippines 7214', 650, 278, 20);

  stroke(40, 386, 1060, 386, C.purple, 4);

  rounded(260, 408, 580, 62, 31, C.lilac);

  text('O F F I C I A L   R E C E I P T', 550, 439, 31, true, C.dark, 'center', 'Georgia');

  text('OR No.:', 52, 512, 23, true, C.dark);

  text(record.orNumber || '—', 162, 512, 23, false, C.ink);

  text('Date:', 740, 512, 23, true, C.dark);

  text(fmtDate(record.receiptDate || record.createdAt), 820, 512, 22);

  ctx.strokeStyle = C.line;

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.roundRect(35, 546, 1030, 138, 15);

  ctx.stroke();

  const customerData = [['Customer Name:', record.customerName || 'Walk-in Customer'], ['Address:', record.customerAddress || '—'], ['Contact No.:', record.customerContact || '—']];

  customerData.forEach(([label, value], i) => {

    const y = 579 + i * 42;
    text(label, 65, y, 22, true, C.dark);
    text(fit(value, 805, 22), 265, y, 22);
  });
  // Item-table height grows with the order. Totals, message and signature are positioned after the last row.

  const tableX = 35, tableW = 1030, tableY = 710, headerH = 47, tableBottom = tableY + headerH + itemRows * rowH;

  rounded(tableX, tableY, tableW, headerH, 11, C.lilac);

  rect(tableX, tableY + 25, tableW, headerH - 25, C.lilac);

  rect(tableX, tableY + headerH, tableW, itemRows * rowH, '#FFFFFF');

  ctx.strokeStyle = C.line;

  ctx.lineWidth = 1.8;

  ctx.strokeRect(tableX, tableY, tableW, headerH + itemRows * rowH);

  const cols = [152, 685, 873];

  cols.forEach(x => stroke(x, tableY, x, tableBottom));

  text('Qty', 94, tableY + 23, 22, true, C.dark, 'center');

  text('Description', 422, tableY + 23, 22, true, C.dark, 'center');

  text('Unit Price', 779, tableY + 23, 22, true, C.dark, 'center');

  text('Amount', 968, tableY + 23, 22, true, C.dark, 'center');

  for (let i = 0; i < itemRows; i++) {

    const y = tableY + headerH + i * rowH;

    if (i % 2 === 1)
      rect(tableX + 1, y, tableW - 2, rowH, '#FEFAFE');

    stroke(tableX, y, tableX + tableW, y, C.line, 1);

    const item = items[i];

    if (!item)
      continue;

    const qty = Number(item.qty) || 0, price = Number(item.price) || 0;

    text(qty, 94, y + rowH / 2, 21, false, C.ink, 'center');

    text(fit(item.name, 500, 20), 169, y + rowH / 2, 20);

    text(money(price), 854, y + rowH / 2, 20, false, C.ink, 'right');

    text(money(qty * price), 1043, y + rowH / 2, 20, false, C.ink, 'right');

  }
  // Summary remains below the dynamically sized table, never inside it.

  const summaryY = tableBottom + 23;

  text('Payment Method:', 55, summaryY + 28, 22, true, C.dark);

  text(fit(record.paymentMethod === 'Others' ? (record.otherPayment || 'Others') : (record.paymentMethod || 'Not specified'), 340, 21), 266, summaryY + 28, 21);

  const boxX = 650, boxW = 415, boxH = 132;

  ctx.strokeStyle = C.line;

  ctx.strokeRect(boxX, summaryY, boxW, boxH);

  stroke(boxX + 220, summaryY, boxX + 220, summaryY + boxH);

  stroke(boxX, summaryY + 43, boxX + boxW, summaryY + 43);

  stroke(boxX, summaryY + 86, boxX + boxW, summaryY + 86);

  rect(boxX + 1, summaryY + 87, boxW - 2, boxH - 88, C.lilac);

  [['Subtotal:', record.subtotal], ['Discount:', record.discount], ['Total Amount:', record.total]].forEach(([label, value], i) => {

    text(label, boxX + 15, summaryY + 22 + i * 43, 21, i === 2, C.dark);
    text(money(value), boxX + boxW - 14, summaryY + 22 + i * 43, 22, i === 2, C.dark, 'right');
  });

  const wordsY = summaryY + 91;

  text('Amount in Words:', 55, wordsY, 21, true, C.dark);

  wrap(numberWords(record.total), 550, 18).slice(0, 3).forEach((s, i) => text(s, 55, wordsY + 28 + i * 25, 18));

  const footerY = summaryY + 183;

  rounded(40, footerY + 48, 550, 65, 20, C.pale);

  text('Thank you for your purchase!', 315, footerY + 79, 29, false, C.purple, 'center', 'Georgia');

  text('Received By:', 688, footerY + 10, 22, true, C.dark);

  try {

    const sign = await loadImage('/scs-receipt-signature.png');
    // Crop whitespace while keeping the handwritten signature, including the heart.

    ctx.drawImage(sign, 26, 48, 720, 450, 735, footerY + 27, 285, 87);

  }
  catch {

  }

  stroke(690, footerY + 123, 1037, footerY + 123, C.ink, 1.5);

  text('Shane Lowelle R. Rafol', 863, footerY + 148, 22, true, C.dark, 'center');

  ctx.strokeStyle = C.purple;

  ctx.lineWidth = 2;

  ctx.strokeRect(25, 25, width - 50, height - 50);

  return canvas.toDataURL('image/png');
}
export function downloadReceipt(uri, number) {

  const a = document.createElement('a');
  a.download = `SCS-Receipt-${number}.png`;
  a.href = uri;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
