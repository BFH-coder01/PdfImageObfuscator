import { rectangle, obfuscate } from './geometry.mjs';
const $ = id => document.getElementById(id);
const canvas = $('canvas'), overlay = $('overlay'), ctx = canvas.getContext('2d');
let image = null, regions = [], start = null, draft = null, result = false, filename = 'image', loadId = 0;
let paintedImage = null, paintedResult = null;
let pdf = null, pageIndex = 0, pageRegions = [], pageSize = null, busy = false;
let pdfTask = null;
let pageResults = [];
let pdfjsPromise;
function pdfjs() {
  return pdfjsPromise ||= import('/vendor/pdf.mjs').then(lib => {
    lib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.mjs'; return lib;
  });
}
function pdfWriter() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = '/vendor/pdf-lib.js';
    script.onload = () => resolve(window.PDFLib); script.onerror = () => reject(new Error('Unable to load PDF exporter.'));
    document.head.append(script);
  });
}
function controls() {
  $('file').disabled = busy;
  $('undo').disabled = $('clear').disabled = busy || result || !regions.length;
  $('obfuscate').disabled = busy || result || !image;
  $('download').disabled = busy || !(pdf ? pageResults.some(Boolean) : result);
  $('edit').hidden = !result; $('edit').disabled = busy;
  $('pages').hidden = !pdf;
  $('previous').disabled = busy || pageIndex === 0;
  $('next').disabled = busy || !pdf || pageIndex === pdf.numPages - 1;
  $('page-number').textContent = pdf ? `Page ${pageIndex + 1} of ${pdf.numPages}` : '';
  $('obfuscate').textContent = pdf ? 'Obfuscate this page' : 'Obfuscate';
  $('download').textContent = pdf ? 'Download PDF' : 'Download PNG';
  overlay.style.pointerEvents = busy || result ? 'none' : 'auto';
}
async function rasterPage(document, index) {
  const page = await document.getPage(index + 1);
  const size = page.getViewport({ scale: 1 });
  // 144 DPI, bounded for unusually large pages.
  const scale = Math.min(2, Math.sqrt(40000000 / (size.width * size.height)), 16000 / Math.max(size.width, size.height));
  const viewport = page.getViewport({ scale });
  const surface = documentElementCanvas();
  surface.width = Math.ceil(viewport.width); surface.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: surface.getContext('2d'), viewport, background: '#ffffff' }).promise;
  page.cleanup();
  return { surface, size: { width: size.width, height: size.height } };
}
function documentElementCanvas() { return document.createElement('canvas'); }
function setImage(next) {
  image = next; start = draft = null;
  canvas.width = next.width; canvas.height = next.height;
  overlay.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
  $('empty').hidden = true; $('stage').hidden = false; render();
}
async function changePage(index) {
  if (busy || !pdf) return;
  busy = true; controls(); status('Loading page…');
  try {
    const rendered = await rasterPage(pdf, index);
    pageIndex = index; regions = pageRegions[index]; pageSize = rendered.size;
    result = pageResults[index];
    setImage(rendered.surface);
    status(`Page ${index + 1} of ${pdf.numPages} · ${result ? 'Obfuscated' : `${regions.length} visible areas selected`}.`);
  } catch (error) { status(`Unable to render page: ${error.message}`); }
  finally { busy = false; controls(); }
}
$('previous').onclick = () => changePage(pageIndex - 1);
$('next').onclick = () => changePage(pageIndex + 1);
function status(text) { $('status').textContent = text; }
function render() {
  if (!image) return;
  if (paintedImage !== image || paintedResult !== result) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (result) obfuscate(ctx, image, regions); else ctx.drawImage(image, 0, 0);
    paintedImage = image; paintedResult = result;
  }
  overlay.replaceChildren();
  if (!result) for (const r of [...regions, ...(draft ? [draft] : [])]) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    for (const [key, value] of Object.entries({ x: r.x, y: r.y, width: r.w, height: r.h })) element.setAttribute(key, value);
    overlay.append(element);
  }
  controls();
}
async function load(file) {
  if (!file || busy) return;
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf && !file.type.startsWith('image/')) { status('Please choose an image or PDF file.'); return; }
  if (file.size > 50 * 1024 * 1024) { status('Please choose a file smaller than 50 MB.'); return; }
  const id = ++loadId, url = URL.createObjectURL(file);
  status('Loading image…');
  busy = true; controls();
  let nextPdf = null;
  let nextTask = null;
  try {
    if (isPdf) {
      status('Loading PDF…');
      const lib = await pdfjs();
      nextTask = lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false,
        cMapUrl: '/vendor/cmaps/', cMapPacked: true, standardFontDataUrl: '/vendor/standard_fonts/', wasmUrl: '/vendor/wasm/' });
      nextPdf = await nextTask.promise;
      const rendered = await rasterPage(nextPdf, 0);
      if (pdfTask) await pdfTask.destroy();
      pdfTask = nextTask;
      pdf = nextPdf; pageIndex = 0; pageRegions = Array.from({length: pdf.numPages}, () => []);
      pageResults = Array(pdf.numPages).fill(false);
      regions = pageRegions[0]; pageSize = rendered.size; result = false;
      filename = file.name.replace(/\.[^.]+$/, '');
      setImage(rendered.surface);
      status(`PDF loaded · ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'}. Select visible areas and obfuscate each page individually.`);
      return;
    }
    const next = new Image(); next.src = url; await next.decode();
    if (id !== loadId) return;
    if (next.naturalWidth * next.naturalHeight > 40000000) throw new Error('Image exceeds 40 million pixels. Please use a smaller image.');
    if (pdfTask) await pdfTask.destroy(); pdfTask = null; pdf = null; pageRegions = []; pageResults = [];
    image = next; regions = []; result = false; start = draft = null;
    filename = file.name.replace(/\.[^.]+$/, '');
    canvas.width = next.naturalWidth; canvas.height = next.naturalHeight;
    overlay.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
    $('empty').hidden = true; $('stage').hidden = false;
    render(); status(`${canvas.width} × ${canvas.height} pixels · Drag rectangles to keep areas visible.`);
  } catch (error) {
    if (nextTask && nextTask !== pdfTask) await nextTask.destroy();
    if (id === loadId) status(isPdf ? `Could not load PDF: ${error.name === 'PasswordException' ? 'Password-protected PDFs are not supported. Use an unlocked copy.' : error.message}` : error.message.startsWith('Image exceeds') ? error.message : 'Could not read this image. Try PNG or JPG.');
  }
  finally { URL.revokeObjectURL(url); busy = false; controls(); }
}
function point(event) {
  const bounds = overlay.getBoundingClientRect();
  return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height };
}
overlay.addEventListener('pointerdown', event => {
  if (!image || result || start || event.button !== 0) return;
  start = point(event); overlay.setPointerCapture(event.pointerId); event.preventDefault();
});
overlay.addEventListener('pointermove', event => {
  if (!start) return;
  draft = rectangle(start, point(event), canvas.width, canvas.height); render();
});
overlay.addEventListener('pointerup', event => {
  if (!start) return;
  const r = rectangle(start, point(event), canvas.width, canvas.height);
  if (r.w > 0 && r.h > 0) regions.push(r);
  start = draft = null; render(); status(`${regions.length} visible area${regions.length === 1 ? '' : 's'} selected.`);
});
overlay.addEventListener('pointercancel', () => { start = draft = null; render(); });
$('file').addEventListener('change', event => { load(event.target.files[0]); event.target.value = ''; });
$('undo').onclick = () => { regions.pop(); render(); status(`${regions.length} visible areas selected.`); };
$('clear').onclick = () => { regions.length = 0; render(); status('Selections cleared. Drag to keep an area visible.'); };
$('obfuscate').onclick = () => { result = true; if (pdf) pageResults[pageIndex] = true; start = draft = null; render(); status(pdf ? `Page ${pageIndex + 1} obfuscated${regions.length ? '' : ' completely black'}. Other pages keep their current state. Your PDF is ready to download.` : regions.length ? 'Obfuscated. Your PNG is ready to download.' : 'Entire image blacked out. Edit selections to keep an area visible.'); };
$('edit').onclick = () => { result = false; if (pdf) pageResults[pageIndex] = false; render(); status('Edit your selections, then obfuscate again.'); };
$('download').onclick = async () => {
  if (pdf) {
    busy = true; controls();
    try {
      const { PDFDocument } = await pdfWriter();
      const output = await PDFDocument.create();
      for (let i = 0; i < pdf.numPages; i++) {
        status(`Creating PDF · page ${i + 1} of ${pdf.numPages}…`);
        const rendered = i === pageIndex ? { surface: image, size: pageSize } : await rasterPage(pdf, i);
        const flattened = documentElementCanvas(); flattened.width = rendered.surface.width; flattened.height = rendered.surface.height;
        if (pageResults[i]) obfuscate(flattened.getContext('2d'), rendered.surface, pageRegions[i]);
        else flattened.getContext('2d').drawImage(rendered.surface, 0, 0);
        const blob = await new Promise(resolve => flattened.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Page export failed.');
        const embedded = await output.embedPng(await blob.arrayBuffer());
        const page = output.addPage([rendered.size.width, rendered.size.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: rendered.size.width, height: rendered.size.height });
        flattened.width = flattened.height = 0;
        if (i !== pageIndex) rendered.surface.width = rendered.surface.height = 0;
      }
      save(new Blob([await output.save()], { type: 'application/pdf' }), 'pdf');
      status('PDF download started.');
    } catch (error) { status(`Unable to export PDF: ${error.message}`); }
    finally { busy = false; controls(); }
    return;
  }
  canvas.toBlob(blob => {
    if (!blob) { status('Unable to export image. Try a smaller image.'); return; }
    save(blob, 'png'); status('PNG download started.');
  }, 'image/png');
};
function save(blob, extension) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `${filename}-obfuscated.${extension}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const workspace = $('workspace');
workspace.addEventListener('dragover', event => { event.preventDefault(); workspace.classList.add('dragover'); });
workspace.addEventListener('dragleave', () => workspace.classList.remove('dragover'));
workspace.addEventListener('drop', event => { event.preventDefault(); workspace.classList.remove('dragover'); load(event.dataTransfer.files[0]); });
