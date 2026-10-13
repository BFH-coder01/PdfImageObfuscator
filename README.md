# Image Obfuscator

A small local application: load an image or PDF, draw rectangles to keep visible, and black out everything else. Files are processed in browser memory and never uploaded. PDF.js and PDF-LIB are installed locally for PDF rendering and export; no external services are used during processing.

## Start

Install Node.js (version 22.13 or later), then double-click **Start.bat**. The launcher installs PDF dependencies on first use if needed (requires internet for installation). Keep the terminal window open while using the app. Close it or press Ctrl+C to stop.

Alternatively run `npm start` in this folder and open http://127.0.0.1:3210.

## Use

1. Click **Load image or PDF**, or drop a file onto the workspace.
2. Drag rectangles around each area you want to keep visible. You can select multiple areas, including overlapping ones. Use **Undo selection** or **Clear selections** to correct them.
3. Click **Obfuscate**. Everything outside the rectangles becomes solid black. With no selections, the entire image becomes black.
4. Click **Download PNG** for an image, or **Download PDF** for a PDF. **Edit selections** returns to the original so you can adjust and regenerate.

For a multi-page PDF, use **Previous page** and **Next page** to work on each page. **Obfuscate this page** applies only to the current page. Selections and obfuscation status are saved separately for each page. A page becomes completely black only if you explicitly obfuscate it with no selections. Other pages remain visually unchanged. **Download PDF** includes all pages in order with their individual current states, and is available after at least one page has been obfuscated. **Edit selections** restores only the current page to its original appearance until you obfuscate it again. PDFs are rendered at 144 DPI (reduced for exceptionally large pages) and exported at their original displayed page sizes as flattened images. Source text, OCR layers, annotations, attachments and source metadata are not copied to the new PDF. Password-protected PDFs require an unlocked copy.

The original file stays unchanged. Downloaded PNGs are newly encoded from the processed canvas; selection outlines and original file metadata are not copied. Transparent areas within selections appear over black. Animated GIFs are exported as a static image. Limits: 50 MB and 40 million pixels per image.

## Design and delivery plan

- Use a local Node server bound to the loopback address, with a browser interface and locally served PDF libraries.
- Store rectangle coordinates at original image resolution while scaling the preview to fit the window.
- Create the output by filling the whole canvas black, then copying only the selected rectangles from the source image.
- Export a flattened PNG or a new PDF containing only processed page images. Keep the original in memory for revisions.
- Include a Windows launcher and focused tests for selection boundaries and black-first rendering.

Run `npm test` for automated checks. Manual acceptance: load a sample with several text rows, select two rows in both drag directions, obfuscate, download, and check the exported image. Also check undo, clear, no selections, image replacement, and a narrow browser window.

## Verification status

Verified on Windows with Node.js 24 and Microsoft Edge: all three unit tests pass. Browser checks cover image loading, forward and reverse rectangle drawing, every output pixel (black outside selections and opaque output), PNG download, undo, clearing, full blackout with no selections, image replacement, and a narrow viewport. PDF checks cover separate page selections and obfuscation state, mixed processed and untouched pages in the actual export, explicit full-page blackout, editing one page independently, preserved page sizes and order, and zero source text in the flattened export.

The optional end-to-end check is `node browser-check.mjs <path-to-playwright-index.mjs>` when Playwright and Microsoft Edge are available. It saves screenshots and a sample PNG in `verification/`.
