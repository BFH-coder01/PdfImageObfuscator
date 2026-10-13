# User manual

Image Obfuscator lets you keep selected rectangular parts of an image or PDF page visible and make everything else black. Your source file is not overwritten. Work stays in your browser until you download the result.

For installation, see [setup.md](setup.md). For design background, see [design.md](design.md).

## Start and stop

If IT has provided a shared host address, open that address in your browser, for example `http://192.168.1.25:3210`. The host operator starts/stops the server; you only need the browser. The address must use the real host IP or hostname supplied by IT.

On a prepared Windows computer, open the application folder and double-click **Start.bat**. A terminal window starts the local server and your browser opens at **http://127.0.0.1:3210**. Keep the terminal open while using the app. If the browser opens before the server is ready, refresh the page.

When finished, save your results, close the browser tab and press **Ctrl+C** in the server's terminal window to stop it. The launcher may then ask you to press a key before its window closes.

## Process an image

1. Click **Load image or PDF** and choose an image, or drag a file into the workspace.
2. Drag from one corner to the opposite corner of each area you want to **keep visible**. You can drag in either direction and add as many rectangles as needed. Rectangles can overlap.
3. Check that each rectangle contains only content you intend to disclose. The area inside the outline is retained.
4. Click **Obfuscate**. Everything outside the selected rectangles becomes solid black. If there are no selections, the whole image becomes black.
5. Click **Download PNG**. Find the result in your browser's download folder, or the location chosen in its save prompt.
6. Open the downloaded file and check it before sharing it.

The filename ends in `-obfuscated.png`. The output has the original image dimensions. Selection outlines do not appear in the download. PNG is the output format even when the input is JPEG, WebP, BMP or GIF.

## Process a PDF

1. Load the PDF with **Load image or PDF**, or drag it into the workspace.
2. Use **Previous page** and **Next page** to reach the page you want to process.
3. Draw rectangles around the areas on that page that should remain visible.
4. Click **Obfuscate this page**. Only the current page is obfuscated.
5. Move to other pages and repeat wherever obfuscation is needed. The app remembers each page's selections and whether you have obfuscated it.
6. Click **Download PDF** when ready. This becomes available after at least one page has been obfuscated.
7. Open the downloaded PDF and review every page before sharing it.

The filename ends in `-obfuscated.pdf`. Download includes **all pages**, in their original order, with each page's current appearance.

| What you do on a page | Appearance in the downloaded PDF |
| --- | --- |
| Leave it untouched | Original rendered appearance. |
| Draw selections but do not click Obfuscate this page | Original rendered appearance. |
| Draw selections and click Obfuscate this page | Selected areas visible; everything else black. |
| Click Obfuscate this page with no selections | Entire page black. |
| Click Edit selections after obfuscating it | Original rendered appearance until you obfuscate that page again. |

For example, in a three-page PDF, obfuscating page 2 leaves pages 1 and 3 visually unchanged. If you want page 3 entirely black, go to page 3 and explicitly click **Obfuscate this page** without selecting any areas.

## Correct a selection

| Control | Action |
| --- | --- |
| Undo selection | Remove the most recently added rectangle on the current image/page. |
| Clear selections | Remove all rectangles on the current image/page. |
| Edit selections | Return the current image/page to its original appearance for editing. |
| Obfuscate / Obfuscate this page | Apply the current selections to the image/current PDF page. |

Rectangles cannot currently be moved or resized. Undo or clear them and draw replacements. Undo and clear are available while editing, not while viewing an obfuscated result.

For PDFs, editing one page does not undo the processing of other pages. If you restore the only obfuscated page to editing mode, Download PDF becomes unavailable until a page is obfuscated again.

## Save and review

The app does not save a project or remember selections after a refresh. Loading another document replaces the current work. Download before changing files or closing the tab.

PDF output is a new document containing flattened page images. Original text and OCR layers, forms, annotations, attachments and source metadata are not copied. Links and digital signatures are not preserved. Even pages left visually unchanged become page images. You will not be able to select or search their original text.

Review the actual downloaded file, not only the preview. In particular, confirm that untouched PDF pages contain information you intend to share. Browser downloads may be saved to a shared or synced folder; use the destination approved by your organisation.

## Supported files and limits

- Inputs: PNG, JPEG/JPG, WebP, BMP, GIF and PDF, subject to browser support for the image encoding.
- Maximum input file size: 50 MB.
- Maximum image size: 40 million pixels.
- PDFs normally render at 144 DPI, with reduced resolution for unusually large pages. Displayed page sizes are preserved in the output.
- Animated GIFs produce a static PNG, not an animation.
- Transparent parts of selected image regions appear over black in obfuscated output.
- Password-protected PDFs need an unlocked copy supplied through your approved document workflow.
- Large PDFs can take longer to export and use substantial memory. There is no fixed page-count limit or progress cancellation button.

## Common problems

| Problem | What to do |
| --- | --- |
| Browser cannot reach the app | For local use, start the app and open `http://127.0.0.1:3210`. For shared use, check the host address with IT and confirm the host is running. |
| Buttons are disabled during loading/export | Wait for the operation to finish and read the status message below the preview. |
| Download is disabled | Obfuscate the image, or at least one page of a PDF. Drawing rectangles alone does not enable export. |
| A PDF page remains visible | That page has not been obfuscated, or you returned it to editing mode. Obfuscate that page explicitly. |
| The whole page becomes black | You clicked Obfuscate without selections. Click Edit selections, draw visible areas and obfuscate again. |
| File cannot be read | Try a valid supported file or an unlocked PDF. If it exceeds the stated limits, use a smaller copy. |
| A PDF export looks less sharp | Output uses raster page images. Ask your administrator about the 144 DPI rendering limit if higher resolution is essential. |
| New controls do not appear after an update | Download current work first, then refresh the browser tab. |
| Changes were lost after refreshing | In-memory selections cannot be recovered; reload the source and repeat the selections. |

## Concurrent use by a team

Your organisation can run the app on one host computer for everyone. Open the address supplied by IT, for example `http://192.168.1.25:3210`, in your browser; replace the example with the host's real address. You do not need to install Node.js on your own machine when using the shared host. Your documents, page selections and downloads remain independent of other users and stay in your browser. The host's admin portal shows your network address, browser information and connection times, but not document information.

Alternatively, each person can run a local copy on their own computer. In that arrangement, `http://127.0.0.1:3210` refers to their own computer. See the [multiple-user setup instructions](setup.md#shared-host-concurrent-use).

Agree who is responsible for each source document and where completed files are saved. The app does not prevent two people processing the same document or saving results with the same name. Follow the organisation's naming, review and access rules for shared folders.
