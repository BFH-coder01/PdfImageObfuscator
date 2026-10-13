// Optional end-to-end verification: node browser-check.mjs <path-to-playwright-index.mjs>
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, rgb } from 'pdf-lib';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
await mkdir('verification', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3210');
  assert.equal(await page.locator('#obfuscate').isDisabled(), true);
  // Generate a deterministic image with opaque color, text and transparency.
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 300;
    const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 600, 300);
    x.fillStyle = '#257958'; x.fillRect(0, 60, 600, 40);
    x.fillStyle = '#182c22'; x.font = '20px sans-serif';
    for (let i = 0; i < 6; i++) x.fillText(`Example row ${i + 1}`, 15, 35 + i * 45);
    x.clearRect(500, 0, 100, 50);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#file').setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => document.querySelector('#status').textContent.includes('600 × 300'));
  const original = await page.locator('#canvas').evaluate(c => Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data));
  async function drag(x1, y1, x2, y2) {
    const b = await page.locator('#overlay').boundingBox();
    await page.mouse.move(b.x + x1 * b.width / 600, b.y + y1 * b.height / 300);
    await page.mouse.down();
    await page.mouse.move(b.x + x2 * b.width / 600, b.y + y2 * b.height / 300, { steps: 8 });
    await page.mouse.up();
  }
  await drag(0, 5, 595, 45);
  await drag(590, 235, 5, 190);
  assert.equal(await page.locator('#overlay rect').count(), 2);
  const regions = await page.locator('#overlay rect').evaluateAll(nodes => nodes.map(n => ({ x: +n.getAttribute('x'), y: +n.getAttribute('y'), w: +n.getAttribute('width'), h: +n.getAttribute('height') })));
  await page.locator('#obfuscate').click();
  const pixels = await page.locator('#canvas').evaluate(c => Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data));
  for (let y = 0; y < 300; y++) for (let x = 0; x < 600; x++) {
    const i = (y * 600 + x) * 4;
    const visible = regions.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
    const alpha = original[i + 3] / 255;
    for (let k = 0; k < 3; k++) assert.equal(pixels[i + k], visible ? Math.round(original[i + k] * alpha) : 0, `pixel ${x},${y} channel ${k}`);
    assert.equal(pixels[i + 3], 255);
  }
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#download').click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), 'sample-obfuscated.png');
  await download.saveAs('verification/sample-obfuscated.png');
  await page.screenshot({ path: 'verification/obfuscated.png', fullPage: true });
  await page.locator('#edit').click();
  await page.locator('#undo').click();
  assert.equal(await page.locator('#overlay rect').count(), 1);
  await page.locator('#clear').click();
  await page.locator('#obfuscate').click();
  assert.equal(await page.locator('#canvas').evaluate(c => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return d.every((v, i) => v === (i % 4 === 3 ? 255 : 0));
  }), true);
  await page.locator('#file').setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForFunction(() => document.querySelector('#download').disabled && !document.querySelector('#obfuscate').disabled);
  assert.equal(await page.locator('#overlay rect').count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await drag(10, 10, 580, 50);
  await page.locator('#obfuscate').click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'verification/mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 1000 });
  const inputPdf = await PDFDocument.create();
  const sampleImage = await inputPdf.embedPng(Buffer.from(png, 'base64'));
  for (const size of [[300,150],[150,300],[300,150]]) {
    const p = inputPdf.addPage(size);
    p.drawImage(sampleImage,{x:0,y:0,width:size[0],height:size[1]});
    p.drawText('PRIVATE SOURCE TEXT',{x:5,y:65,size:10,color:rgb(1,0,0)});
  }
  await page.locator('#file').setInputFiles({name:'sample.pdf',mimeType:'application/pdf',buffer:Buffer.from(await inputPdf.save())});
  await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('PDF loaded'));
  assert.equal(await page.locator('#page-number').textContent(),'Page 1 of 3');
  await drag(10,5,590,45);
  const readRegions = () => page.locator('#overlay rect').evaluateAll(nodes => nodes.map(n => ({x:+n.getAttribute('x'),y:+n.getAttribute('y'),w:+n.getAttribute('width'),h:+n.getAttribute('height')})));
  const firstRegions = await readRegions();
  await page.locator('#next').click();
  await page.waitForFunction(() => document.querySelector('#page-number').textContent === 'Page 2 of 3' && !document.querySelector('#next').disabled);
  assert.equal(await page.locator('#overlay rect').count(),0);
  const secondOriginal = await page.locator('#canvas').evaluate(c => c.toDataURL('image/png').split(',')[1]);
  await page.locator('#next').click();
  await page.waitForFunction(() => document.querySelector('#page-number').textContent === 'Page 3 of 3');
  const thirdOriginal = await page.locator('#canvas').evaluate(c => c.toDataURL('image/png').split(',')[1]);
  await drag(590,235,5,190);
  const thirdRegions = await readRegions();
  await page.locator('#previous').click();
  await page.waitForFunction(() => document.querySelector('#page-number').textContent === 'Page 2 of 3' && !document.querySelector('#previous').disabled);
  await page.locator('#previous').click();
  await page.waitForFunction(() => document.querySelector('#page-number').textContent === 'Page 1 of 3');
  assert.equal(await page.locator('#overlay rect').count(),1);
  await page.locator('#obfuscate').click();
  const pdfDownloadEvent = page.waitForEvent('download');
  await page.locator('#download').click();
  const pdfDownload = await pdfDownloadEvent;
  assert.equal(pdfDownload.suggestedFilename(),'sample-obfuscated.pdf');
  await pdfDownload.saveAs('verification/sample-obfuscated.pdf');
  const exportedBytes = await readFile('verification/sample-obfuscated.pdf');
  const exported = await PDFDocument.load(exportedBytes);
  assert.equal(exported.getPageCount(),3);
  assert.deepEqual(exported.getPages().map(p=>[p.getWidth(),p.getHeight()]),[[300,150],[150,300],[300,150]]);
  const pdfChecks = await page.evaluate(async ({bytes,regions}) => {
    const lib = await import('/vendor/pdf.mjs');
    const task = lib.getDocument({data:new Uint8Array(bytes)}); const d = await task.promise;
    const checks = [];
    for(let i=1;i<=d.numPages;i++) {
      const p = await d.getPage(i), c = document.createElement('canvas'), viewport = p.getViewport({scale:2});
      c.width=viewport.width;c.height=viewport.height;
      await p.render({canvasContext:c.getContext('2d'),viewport}).promise;
      const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let outsideBlack = true;
      for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) {
        if(regions[i-1].some(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)) continue;
        const k=(y*c.width+x)*4;
        if(pixels[k]||pixels[k+1]||pixels[k+2]||pixels[k+3]!==255) outsideBlack=false;
      }
      checks.push({text:(await p.getTextContent()).items.length,black:pixels.every((v,j)=>v===(j%4===3?255:0)),visible:pixels.some((v,j)=>j%4!==3&&v>0),outsideBlack,png:c.toDataURL('image/png').split(',')[1]});
    }
    await task.destroy();return checks;
  },{bytes:Array.from(exportedBytes),regions:[firstRegions,[],thirdRegions]});
  for(let i=0;i<pdfChecks.length;i++) await writeFile(`verification/pdf-output-page-${i+1}.png`,Buffer.from(pdfChecks[i].png,'base64'));
  assert.deepEqual(pdfChecks.map(({png,...check})=>check),[{text:0,black:false,visible:true,outsideBlack:true},{text:0,black:false,visible:true,outsideBlack:false},{text:0,black:false,visible:true,outsideBlack:false}]);
  assert.equal(pdfChecks[1].png,secondOriginal,'Untouched page must export with identical pixels');
  assert.equal(pdfChecks[2].png,thirdOriginal,'Selections alone must not obfuscate a page');
  await page.screenshot({path:'verification/pdf-preview.png',fullPage:true});
  await page.locator('#next').click();
  await page.waitForFunction(() => document.querySelector('#page-number').textContent === 'Page 2 of 3' && !document.querySelector('#next').disabled);
  assert.equal(await page.locator('#edit').isVisible(),false);
  assert.equal(await page.locator('#download').isDisabled(),false);
  assert.equal(await page.locator('#canvas').evaluate(c=>c.toDataURL('image/png').split(',')[1]),secondOriginal);
  await page.locator('#obfuscate').click();
  assert.equal(await page.locator('#canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.every((v,i)=>v===(i%4===3?255:0))),true);
  await page.locator('#next').click();
  await page.waitForFunction(() => document.querySelector('#page-number').textContent === 'Page 3 of 3');
  assert.equal(await page.locator('#overlay rect').count(),1);
  assert.equal(await page.locator('#edit').isVisible(),false);
  await page.locator('#obfuscate').click();
  await page.locator('#previous').click();
  await page.waitForFunction(() => document.querySelector('#page-number').textContent === 'Page 2 of 3' && !document.querySelector('#previous').disabled);
  assert.equal(await page.locator('#edit').isVisible(),true);
  await page.locator('#previous').click();
  await page.waitForFunction(() => document.querySelector('#page-number').textContent === 'Page 1 of 3');
  assert.equal(await page.locator('#edit').isVisible(),true);
  await page.locator('#edit').click();
  assert.equal(await page.locator('#overlay rect').count(),1);
  await page.locator('#next').click();
  await page.waitForFunction(() => document.querySelector('#page-number').textContent === 'Page 2 of 3' && !document.querySelector('#previous').disabled);
  assert.equal(await page.locator('#edit').isVisible(),true,'Editing page 1 must not undo page 2');
  await page.locator('#file').setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a pdf')});
  await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Could not load PDF:'));
  assert.equal(await page.locator('#download').isDisabled(),false);
  await page.locator('#file').setInputFiles({name:'image-again.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.waitForFunction(() => document.querySelector('#pages').hidden && !document.querySelector('#obfuscate').disabled);
  assert.equal(await page.locator('#download').textContent(),'Download PNG');
  assert.deepEqual(errors, []);
  console.log('PASS: image workflow; PDF obfuscation applies only to current page, untouched pages export with identical pixels, selections alone do not obfuscate, explicit blackout and independent editing persist; no browser errors.');
} finally { await browser.close(); }
