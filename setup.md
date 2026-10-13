# Local and organisational setup

This guide is for people installing the application and IT staff distributing it to a team. The supported deployment model is **one local Node.js process per user computer**, with documents processed in that user's browser. See [manual.md](manual.md) for use and [design.md](design.md) for the architecture and history.

## Requirements

| Component | Requirement |
| --- | --- |
| Operating system | Windows for the supplied `Start.bat` launcher. Command-line startup also uses standard Node.js on other platforms, but they have not been verified in this project. |
| Node.js | Version 22.13 or later; Node.js 24 was used for verification. Use an organisation-approved, supported release. |
| npm | Required for the launcher's automatic first-use installation and the simple installation route. Include npm when installing Node.js. |
| Browser | A current organisation-approved browser with canvas, SVG, JavaScript modules and WebAssembly enabled. Microsoft Edge was verified. |
| Git | Optional: needed for clone/pull-based installation, not for ZIP-based installation. |
| pnpm | Optional for ordinary use; recommended for IT installation from the committed dependency lockfile. Version 11.25.0 was used for this project. |
| Permissions | Write access to the installation folder during installation, and to the user's download/output folder. Ordinary runtime does not need administrator privileges. |
| Network | GitHub access to obtain source, plus access to the approved package registry for installation. No external connection is required for normal document processing once dependencies are installed. |

Use the [official Node.js download page](https://nodejs.org/en/download), or your software catalogue. On Windows an installer can provide both Node.js and npm; see the [npm installation guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/). Administrator approval may be needed for software installation under your organisation's policy.

After installation, open a new terminal and check:

```powershell
node --version
npm.cmd --version
```

`npm.cmd` avoids a PowerShell script-execution-policy issue with `npm.ps1`. The application does not require changing PowerShell execution policy.

## Obtain the solution from GitHub

Repository: [BFH-coder01/PdfImageObfuscator](https://github.com/BFH-coder01/PdfImageObfuscator).

### Option A: Git clone

Install Git through your approved software process, then run:

```powershell
git clone https://github.com/BFH-coder01/PdfImageObfuscator.git
Set-Location PdfImageObfuscator
git rev-parse HEAD
```

Run this from a parent folder where you are allowed to create the application folder. The last command records the installed source revision. If GitHub requires authentication, use your organisation's approved GitHub access method; do not put tokens into command history or repository URLs.

For controlled deployment, IT should choose and distribute a tested commit or release rather than assuming that the newest `main` is approved. To select an approved commit after cloning:

```powershell
git checkout <approved-commit-id>
```

Replace the placeholder before running it. A detached checkout at an approved commit is expected. This documentation is part of a source checkout; it is available through GitHub only after that checkout's documentation changes have been committed and pushed.

### Option B: GitHub ZIP

1. Open the repository in your browser.
2. Choose **Code**, then **Download ZIP**. For an approved version, download the ZIP for the specific commit/tag selected by IT.
3. Extract the entire ZIP to a local folder where installation is permitted.
4. Open a terminal in the extracted folder containing `package.json` and `Start.bat`.

Extraction alone does not install the dependencies. A ZIP download does not include Git history, so `git pull` cannot update that installation.

## Install dependencies

### Simple installation

From the application folder:

```powershell
npm.cmd install
node server.mjs
```

Open `http://127.0.0.1:3210` in the browser. Alternatively, double-click **Start.bat**: it checks for Node.js, attempts `npm install` if PDF.js is missing, starts the server and opens the browser after a short delay.

The repository commits `pnpm-lock.yaml`, not `package-lock.json`. Consequently, `npm install` follows the version ranges in `package.json` and may select dependency versions different from those originally tested. `npm ci` is not the installation command for the current checkout because an npm lockfile is not supplied.

### Reproducible IT installation

Use the committed pnpm lockfile to reproduce the tested dependency set:

```powershell
npm.cmd install --global pnpm@11.25.0
pnpm.cmd install --frozen-lockfile
node --test
node server.mjs
```

Install pnpm using your organisation's approved package-management process if global npm installation is restricted. Use one package manager consistently for a deployment; do not alternate npm and pnpm installs in the same prepared folder. Record the source commit, Node version, pnpm version and test results with the deployment package.

`--frozen-lockfile` should fail if the manifest and lockfile disagree; investigate that failure rather than silently regenerating a production lockfile. The current direct dependencies are PDF.js (`pdfjs-dist`) and PDF-LIB (`pdf-lib`). Dependency files in `node_modules` are required at startup for both image and PDF use.

## Configuration

No `.env`, database, API key or application account is required. Current settings are defined in source:

| Setting | Current value and location |
| --- | --- |
| Listen address | `127.0.0.1` in `server.mjs`. |
| Port | `3210` in `server.mjs`. |
| Launcher URL | `http://127.0.0.1:3210` in `Start.bat`. |
| File/image limits | 50 MB / 40 million image pixels in `app.js`. |
| PDF rendering | Scale 2, reduced for exceptionally large pages, in `app.js`. |
| Document storage | Browser memory during use; downloads saved through the browser. |

Keep the loopback listening address for local deployment. There is no reason to open an inbound firewall port for another computer. No administrator elevation is required to listen on this local port.

There is currently no `PORT` environment-variable setting. If IT changes the port, it must update the server listener, server message and launcher URL, and use the corresponding browser address. Automated browser tests also use port 3210 and need adjustment for a changed port.

### Registry, proxy and certificates

Use the organisation's existing package-registry configuration where available. Example user-level settings, with placeholders replaced by IT-provided values:

```powershell
npm.cmd config set registry "https://packages.example.org/npm/"
npm.cmd config set https-proxy "http://proxy.example.org:8080"
npm.cmd config set cafile "C:\Certificates\organisation-ca.pem"
```

Configure only the settings actually required by your network. These modify the user's package-manager configuration; they are not runtime app settings. The [npm configuration reference](https://docs.npmjs.com/cli/v11/using-npm/config/) documents registry, proxy and certificate settings. Keep registry credentials outside the repository in approved user/machine configuration. Retain TLS certificate verification.

## Concurrent use across an organisation

### Recommended: local copies on user computers

Install the same approved version on each workstation. Each user starts their local app and opens `http://127.0.0.1:3210` on their own computer. All users can work concurrently because the processes, browser state and document memory are independent. Port 3210 can be used on every workstation without conflict between computers.

There is no shared server workload for document processing. Practical capacity depends on each workstation's browser and memory, particularly for large PDFs. This project has not established a maximum supported number of organisational users through load testing.

| Team concern | Operational arrangement |
| --- | --- |
| Work allocation | Assign source documents through the team's existing process. The app has no shared queue. |
| Output collection | Use an approved local/shared output location and naming convention. |
| Review | Define who reviews every exported page before release. |
| Access | Apply OS permissions and existing controls to source and output folders. |
| Duplicate work | Coordinate externally; there is no document locking or duplicate detection. |
| Versions | Distribute the same tested revision and maintain an installation inventory. |
| Support | Identify an IT owner for Node/browser updates, dependency checks and troubleshooting. |

Multiple browser tabs on one computer also have separate sessions. They can share one running local server, but do not synchronise selections. Starting a second server on that same machine normally fails because port 3210 is already occupied. On terminal-server/shared-machine installations, browser sessions remain separate but the listener can be reached by other local users; treat that as a shared-host deployment requiring IT assessment.

### Shared web hosting is a separate deployment

The supplied server binds to loopback, so colleagues cannot access your workstation's app over the LAN. Sharing a link to `127.0.0.1` sends each colleague to their own computer, not yours.

A central static hosting deployment could serve the interface and PDF libraries while leaving document processing in each browser, but it is not supplied or verified here. IT would need to configure hosting, HTTPS, organisational access controls, all library/worker/font/WASM paths and MIME types, and browser compatibility. Application authentication, audit logging, central processing, saved projects and collaboration are not implemented. Do not describe a change to `0.0.0.0` alone as a complete multi-user service.

## Offline and managed distribution

For users without registry access, IT can prepare a complete application bundle on an approved staging machine:

1. Obtain the approved source revision and install dependencies from the approved registry using the locked route.
2. Run the acceptance checks below.
3. Package the application source, `package.json`, `pnpm-lock.yaml`, launcher, license, guides and **the complete `node_modules` directory**. Preserve pnpm's internal directory/link structure when copying or extracting it; do not copy only top-level package links.
4. Exclude `.git` if Git updates are not needed, and exclude generated `verification` files and real documents. Dependencies may contain platform-specific optional packages; prepare/test the bundle on the same OS and architecture as target workstations.
5. Install the approved Node runtime separately on each endpoint and distribute/extract the bundle through your software-management system.
6. Test startup and PDF import/export on a target endpoint with external network access unavailable. Once complete dependencies are present, the launcher skips its PDF.js installation check and normal processing uses local assets only.

Include upstream license notices and complete the organisation's normal dependency review. Treat the source and installed dependencies as one versioned deployment unit. Runtime app assets can be read-only after installation; browser output locations still require write permission.

## Acceptance checks before rollout

Run the unit tests from the application folder:

```powershell
node --test
```

Start the app and use non-sensitive samples to check:

1. Image import, several rectangles in both drag directions, undo, clear, blacked-out preview and PNG download.
2. A multi-page image PDF: obfuscate only page 2 and confirm pages 1 and 3 remain visible in the downloaded file.
3. A page explicitly obfuscated without selections becomes entirely black.
4. Editing one processed page restores only that page, with other processed pages retaining their state.
5. Reopen the downloaded PDF and check page count, order, appearance and loss of original selectable text.
6. Test installation and simultaneous independent use on at least two intended workstations, including approved output folders.

For automated browser checks, provide Playwright and Microsoft Edge on a test workstation. Playwright is an optional testing tool, not an application runtime dependency. `browser-check.mjs` accepts the absolute path to Playwright's `index.mjs`:

```powershell
node browser-check.mjs "C:\approved-test-tools\node_modules\playwright\index.mjs"
```

Replace the sample path with the actual installed test library. The app must be running on port 3210. Checks create non-sensitive samples and output under `verification/`, which Git ignores. These tests have been run in the development environment; each organisation must also verify its own deployment.

## Updates and rollback

Finish and download current work before updating. Stop the server. For a Git-based `main` installation with no local changes:

```powershell
git status --short
git pull --ff-only
pnpm.cmd install --frozen-lockfile
node --test
```

Do not discard local changes to make an update proceed. Have IT reconcile them. A checkout pinned to an approved commit should be updated to another approved commit rather than using the `main` pull workflow. Restart the server and refresh browser tabs after installation; existing tabs keep the previous JavaScript until reloaded.

For ZIP/bundle installations, prepare the new approved version in a separate folder and switch the shortcut after testing. Keep the previous approved bundle for rollback. For a clean Git checkout, rollback can use `git checkout <previous-approved-commit>` followed by a locked dependency installation. This code rollback does not recover unsaved browser sessions or reverse files already downloaded.

## Troubleshooting and maintenance

| Symptom | Check or action |
| --- | --- |
| Node.js required / `node` not recognised | Install approved Node, include it in PATH and reopen the terminal. |
| npm not recognised | Ensure npm was included with Node; `Start.bat` cannot install missing dependencies without it. |
| PowerShell blocks npm.ps1 | Use `npm.cmd` or `Start.bat`; do not weaken machine execution policy for this app. |
| Module not found at startup | Dependencies are missing or incomplete. Reinstall using the chosen package manager in the correct folder. |
| Installation fails behind corporate proxy | Ask IT to verify registry access, proxy settings, authentication and CA certificate configuration. |
| Port 3210 already in use | Use the existing app server if it is the expected process, or ask IT to identify the listener. Do not terminate an unknown process. |
| Browser opens but reports connection refused | Check terminal errors and refresh once the server is ready. |
| Old interface after an update | Save current work, then refresh the tab. |
| PDF library/worker/resource errors | Verify the full dependencies are present and use the local HTTP address rather than opening index.html directly. |
| Browser uses excessive memory on a PDF | Try a smaller approved source or a workstation with more memory; current limits do not bound total export memory. |

Keep Node, browsers and dependencies under the organisation's maintenance process, with regression testing before dependency upgrades. The app does not log document operations or persist selection sessions. Monitor startup errors through the terminal; it is not a managed Windows service and does not start automatically at login.
