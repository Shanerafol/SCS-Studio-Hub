// Branded, dynamically sized pricelist exports without requiring a paid service.
const BUSINESS = ['09456939550', 'Facebook: Shane Creative Studio', 'Aspo Boarding House, Maloro, Tangub City, Philippines 7214'];
const SUBS = { Flowers: ['Single', 'Bouquet'], Keychains: ['Figures', 'Random'], 'Premium Accounts': ['ChatGPT', 'Canva', 'CapCut', 'Microsoft 365', 'Spotify', 'Others'] };
function groupOf(p) {

  if (p.subcategory && p.subcategory !== 'Materials')
    return p.subcategory;
  if (p.category === 'Premium Accounts')
    return SUBS['Premium Accounts'].find(g => String(p.name).toLowerCase().includes(g.toLowerCase())) || 'Others';
  return p.category === 'Keychains' ? 'Random' : 'Single';
}
const peso = n => 'PHP ' + (Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function loadLogo() {

  return new Promise(resolve => {

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/scs-logo.png';
  });
}
function drawText(ctx, text, x, y, maxWidth, lineHeight = 24) {

  const words = String(text).split(/\s+/);
  let line = '', yy = y;
  for (const word of words) {

    const candidate = line ? line + ' ' + word : word;

    if (line && ctx.measureText(candidate).width > maxWidth) {

      ctx.fillText(line, x, yy);

      yy += lineHeight;

      line = word;

    }
    else
      line = candidate;
  }
  if (line)
    ctx.fillText(line, x, yy);
  return yy + lineHeight;
}
function download(blob, name) {

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const bytes = s => new TextEncoder().encode(s);
// Assemble a standards-compatible image-only PDF. Multiple pages keep long catalogs legible.
function pdfFromCanvases(canvases) {

  const parts = [];

  let count = 0, position = 0;

  const offsets = [0];

  const push = (b) => {

    parts.push(b);
    position += b.length;
  };

  const str = s => push(bytes(s));

  const object = (id, content) => {

    offsets[id] = position;
    str(`${id} 0 obj\n${content}\nendobj\n`);
  };

  const N = canvases.length, rootId = 1, pagesId = 2;

  str('%PDF-1.4\n');

  object(rootId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const pageIds = canvases.map((_, i) => 3 + i * 3);

  object(pagesId, `<< /Type /Pages /Kids [${pageIds.map(id => id + ' 0 R').join(' ')}] /Count ${N} >>`);

  canvases.forEach((canvas, i) => {

    const pageId = pageIds[i], imgId = pageId + 1, contentId = pageId + 2;

    const jpeg = atob(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);

    const imageBytes = new Uint8Array(jpeg.length);

    for (let j = 0; j < jpeg.length; j++)
      imageBytes[j] = jpeg.charCodeAt(j);

    const w = 595, h = 842;

    object(pageId, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im${i} ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`);

    offsets[imgId] = position;

    str(`${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);

    push(imageBytes);

    str('\nendstream\nendobj\n');

    const cmds = `q\n${w} 0 0 ${h} 0 0 cm\n/Im${i} Do\nQ\n`;

    object(contentId, `<< /Length ${bytes(cmds).length} >>\nstream\n${cmds}endstream`);

  });

  count = 2 + N * 3;

  const xref = position;

  str(`xref\n0 ${count + 1}\n0000000000 65535 f \n`);

  for (let id = 1; id <= count; id++)
    str(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);

  str(`trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  return new Blob(parts, { type: 'application/pdf' });
}
export async function exportPriceList(products, categories, format = 'pdf') {

  if (!categories?.length)
    throw Error('Choose at least one category.');

  const logo = await loadLogo();

  const width = 1100, margin = 68;

  const listed = products.filter(p => categories.includes(p.category) && p.subcategory !== 'Materials');

  if (!listed.length)
    throw Error('No selling products found in those categories. Add products before exporting.');
  // Preload product photos so both PNG and PDF contain the same actual product images.

  const imageCache = new Map();

  await Promise.all(listed.map(p => new Promise(resolve => {

    if (!p.image) {

      resolve();

      return;

    }

    const img = new Image();

    img.onload = () => {

      imageCache.set(p.id, img);
      resolve();
    };

    img.onerror = () => resolve();

    img.src = p.image;

  })));

  const entries = [];

  for (const category of ['Flowers', 'Keychains', 'Premium Accounts']) {

    if (!categories.includes(category))
      continue;

    const categoryItems = listed.filter(p => p.category === category);

    if (!categoryItems.length)
      continue;

    entries.push({ type: 'category', text: category, height: 76 });

    for (const sub of [...new Set([...SUBS[category], ...categoryItems.map(groupOf)])]) {

      const rows = categoryItems.filter(p => groupOf(p) === sub);

      if (!rows.length)
        continue;

      entries.push({ type: 'subcategory', text: sub, height: 45 });

      for (let i = 0; i < rows.length; i += 4)
        entries.push({ type: 'cards', products: rows.slice(i, i + 4), height: 314 });

    }

  }

  const makeCanvas = () => {

    const c = document.createElement('canvas');
    c.width = width;
    c.height = 1550;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, 1550);
    return [c, ctx];
  };

  const pages = [];

  let [canvas, ctx] = makeCanvas(), y = 0;

  const header = first => {

    ctx.fillStyle = '#843aa1';
    ctx.fillRect(0, 0, width, 12);
    if (first && logo)
      ctx.drawImage(logo, margin, 42, 155, 155);
    ctx.fillStyle = '#51246a';
    ctx.font = 'bold 39px Georgia';
    ctx.fillText('SHANE CREATIVE STUDIO', first ? 240 : margin, first ? 86 : 84);
    ctx.font = 'bold 24px Arial';
    ctx.fillText('PRICE LIST', first ? 241 : margin, first ? 127 : 128);
    ctx.fillStyle = '#584568';
    ctx.font = '19px Arial';
    BUSINESS.forEach((line, i) => ctx.fillText(line, first ? 242 : margin, (first ? 161 : 166) + i * 28));
    ctx.strokeStyle = '#ba8dcf';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(margin, first ? 261 : 266);
    ctx.lineTo(width - margin, first ? 261 : 266);
    ctx.stroke();
    y = 299;
  };

  header(true);

  function nextPage() {

    pages.push(canvas);
    [canvas, ctx] = makeCanvas();
    header(false);
  }

  function card(p, x, top, cardW) {

    const h = 290, inner = 10, iw = cardW - inner * 2, ih = 172;

    ctx.fillStyle = '#fcf8fd';

    ctx.strokeStyle = '#d8b6e5';

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.roundRect(x, top, cardW, h, 12);

    ctx.fill();

    ctx.stroke();

    const ix = x + inner, iy = top + inner;

    ctx.save();

    ctx.beginPath();

    ctx.roundRect(ix, iy, iw, ih, 8);

    ctx.clip();

    ctx.fillStyle = '#f0e4f5';

    ctx.fillRect(ix, iy, iw, ih);

    const img = imageCache.get(p.id);

    if (img) {

      const scale = Math.min(iw / img.width, ih / img.height);

      const w = img.width * scale, hh = img.height * scale;

      ctx.drawImage(img, ix + (iw - w) / 2, iy + (ih - hh) / 2, w, hh);

    }
    else {

      ctx.fillStyle = '#9065a4';

      ctx.font = '16px Arial';

      ctx.textAlign = 'center';

      ctx.fillText('No photo', ix + iw / 2, iy + ih / 2);

      ctx.textAlign = 'left';

    }

    ctx.restore();

    ctx.fillStyle = '#35233e';

    ctx.font = 'bold 18px Arial';

    ctx.textAlign = 'left';

    drawText(ctx, p.name || 'Product', ix, top + 205, iw, 22);

    ctx.fillStyle = '#7d3498';

    ctx.font = 'bold 19px Arial';

    ctx.fillText(peso(p.price), ix, top + 273);

  }

  for (const e of entries) {

    if (y + e.height > 1440)
      nextPage();

    if (e.type === 'category') {

      ctx.fillStyle = '#eee0f5';

      ctx.fillRect(margin, y, width - 2 * margin, 50);

      ctx.fillStyle = '#622578';

      ctx.font = 'bold 29px Georgia';

      ctx.fillText(e.text, margin + 16, y + 35);

      y += e.height;

    }
    else if (e.type === 'subcategory') {

      ctx.fillStyle = '#8c4aab';

      ctx.font = 'bold 23px Arial';

      ctx.fillText(e.text, margin + 9, y + 29);

      y += e.height;

    }
    else {

      const cardW = (width - margin * 2 - 36) / 4;

      e.products.forEach((p, i) => card(p, margin + i * (cardW + 12), y, cardW));

      y += e.height;

    }

  }

  pages.push(canvas);

  for (let i = 0; i < pages.length; i++) {

    const c = pages[i], cx = c.getContext('2d');

    cx.fillStyle = '#8b7499';

    cx.font = '18px Arial';

    cx.textAlign = 'center';

    cx.fillText(`Shane Creative Studio  •  Page ${i + 1} of ${pages.length}`, width / 2, 1503);

    cx.textAlign = 'left';

  }

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'pdf') {

    download(pdfFromCanvases(pages), `SCS_Price_List_${stamp}.pdf`);

    return;

  }
  // Long image: stitch pages vertically to avoid cropping any product or category.

  const combined = document.createElement('canvas');

  combined.width = width;

  combined.height = pages.length * 1550;

  const cc = combined.getContext('2d');

  pages.forEach((page, i) => cc.drawImage(page, 0, i * 1550));

  await new Promise((resolve, reject) => combined.toBlob(blob => blob ? (download(blob, `SCS_Price_List_${stamp}.png`), resolve()) : reject(Error('Could not export image')), 'image/png'));
}
