# Image Obfuscator

## Documentation

- [User manual](manual.md): selecting areas, processing individual PDF pages and saving results.
- [Setup guide](setup.md): GitHub installation, prerequisites, configuration and concurrent organisational use.
- [Design history](design.md): decisions, architecture, development stages and verification.

A small local application: load an image or PDF, draw rectangles to keep visible, and black out everything else. Files are processed in browser memory and never uploaded. PDF.js and PDF-LIB are installed locally for PDF rendering and export; no external services are used during processing.

## Start

Install Node.js (version 22.13 or later), then double-click **Start.bat**. The launcher installs PDF dependencies on first use if needed (requires internet for installation). Keep the terminal window open while using the app. Close it or press Ctrl+C to stop.

Alternatively run `npm start` in this folder and open http://127.0.0.1:3210.

## For Multiple Users

Only the **host machine** needs the application and Node.js installed. Other users on the same organisation network need a browser.

1. Start the app on the host with **Start.bat** or `node server.mjs` and keep it running.
2. On that machine, open Command Prompt and type `ipconfig`. Under the connected Ethernet or Wi-Fi adapter, find the **IPv4 Address**, for example `192.168.1.25`. Ignore disconnected adapters. The app's terminal also prints available network URLs; choose the address reachable by your colleagues.
3. Each user types **`http://192.168.1.25:3210`** into their browser's address bar, replacing the example with the host's actual IPv4 address. Do not use `127.0.0.1` on another computer; that address refers to the user's own machine.
4. If the address cannot be reached, ask IT to allow inbound TCP port **3210** on the host for the approved internal network, and check routing or Wi-Fi client isolation. Do not expose the app directly to the internet.

Users can work at the same time with separate documents, selections and downloads. Processing happens in each browser; files are not uploaded to the host. Keep the host awake and connected. If its IP address changes, use the new address; IT can provide a stable address or internal DNS name.

### Admin portal

On the host computer, open **http://127.0.0.1:3210/admin**. It shows active machine addresses, open browser sessions, browser information and last contact times. It refreshes every 5 seconds; sessions expire after 60 seconds without contact. Only the host can access the portal; remote users receive an access-denied response.

The list reflects observed network addresses, not verified device names or user identities. Multiple tabs can belong to one machine, and proxies/NAT can make several machines share one address. No document information is collected. Session information is held in memory and cleared when the host restarts. Application access has no login and uses HTTP; use it on an IT-approved internal network. See [setup.md](setup.md#shared-host-concurrent-use) for deployment details.

## Use

1. Click **Load image or PDF**, or drop a file onto the workspace.
2. Drag rectangles around each area you want to keep visible. You can select multiple areas, including overlapping ones. Use **Undo selection** or **Clear selections** to correct them.
3. Click **Obfuscate**. Everything outside the rectangles becomes solid black. With no selections, the entire image becomes black.
4. Click **Download PNG** for an image, or **Download PDF** for a PDF. **Edit selections** returns to the original so you can adjust and regenerate.

For a multi-page PDF, use **Previous page** and **Next page** to work on each page. **Obfuscate this page** applies only to the current page. Selections and obfuscation status are saved separately for each page. A page becomes completely black only if you explicitly obfuscate it with no selections. Other pages remain visually unchanged. **Download PDF** includes all pages in order with their individual current states, and is available after at least one page has been obfuscated. **Edit selections** restores only the current page to its original appearance until you obfuscate it again. PDFs are rendered at 144 DPI (reduced for exceptionally large pages) and exported at their original displayed page sizes as flattened images. Source text, OCR layers, annotations, attachments and source metadata are not copied to the new PDF. Password-protected PDFs require an unlocked copy.

The original file stays unchanged. Downloaded PNGs are newly encoded from the processed canvas; selection outlines and original file metadata are not copied. Transparent areas within selections appear over black. Animated GIFs are exported as a static image. Limits: 50 MB and 40 million pixels per image.

## Design and delivery plan

- Use a Node server on the internal network, with browser-based document processing and locally served PDF libraries; local-only mode is also available.
- Store rectangle coordinates at original image resolution while scaling the preview to fit the window.
- Create the output by filling the whole canvas black, then copying only the selected rectangles from the source image.
- Export a flattened PNG or a new PDF containing only processed page images. Keep the original in memory for revisions.
- Include a Windows launcher and focused tests for selection boundaries and black-first rendering.

Run `npm test` for automated checks. Manual acceptance: load a sample with several text rows, select two rows in both drag directions, obfuscate, download, and check the exported image. Also check undo, clear, no selections, image replacement, and a narrow browser window.

## Verification status

Verified on Windows with Node.js 24 and Microsoft Edge: all three unit tests pass. Browser checks cover image loading, forward and reverse rectangle drawing, every output pixel (black outside selections and opaque output), PNG download, undo, clearing, full blackout with no selections, image replacement, and a narrow viewport. PDF checks cover separate page selections and obfuscation state, mixed processed and untouched pages in the actual export, explicit full-page blackout, editing one page independently, preserved page sizes and order, and zero source text in the flattened export.

Shared-host checks also pass: two concurrent browser contexts register in the admin portal, the image/PDF workflow works through the host's LAN address, stale sessions expire, and non-loopback clients cannot retrieve admin pages or session data. The five automated tests pass. These checks ran on the host; access from a second physical machine still depends on your firewall and network configuration.

The optional end-to-end check is `node browser-check.mjs <path-to-playwright-index.mjs>` when Playwright and Microsoft Edge are available. It saves screenshots and a sample PNG in `verification/`.
