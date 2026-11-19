# deepseek-chat-demo

[简体中文](README.md) | English

A static chat demo powered by the DeepSeek API. No application backend is required: the browser connects directly to the configured API service.

This repository is a fork of [hmjz100/deepseek-chat-demo](https://github.com/hmjz100/deepseek-chat-demo), which is itself an unofficial derivative of [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo), rebuilt and extended for UI research. It is not affiliated with or endorsed by DeepSeek. The UI is implemented piece by piece against chat.deepseek.com.

On top of the direct upstream, this fork focuses on chat history import: batch writes, a single parse of the ZIP central directory, and an import progress dialog with a live log. See [Changes from upstream](#changes-from-upstream).

You can [try the app online](https://louisyang841.github.io/deepseek-chat-demo/), or clone the repository and build it as described below. Enter your API key in Settings before your first chat.

## Getting started

Install Node.js 22.12+ and pnpm, then run:

```sh
git clone https://github.com/LouisYang841/deepseek-chat-demo.git
cd deepseek-chat-demo
pnpm install
pnpm dev
```

Open http://localhost:8090.

To build the static site:

```sh
pnpm build
```

The output is written to `dist/`. Deploy it to a static web server or open `dist/index.html` directly. Opening the file directly requires browser support for storage on `file://` pages and an API service that permits their cross-origin requests.

## Features

- Multiple conversations with automatic titles, renaming, and deletion; edit prompts, regenerate replies, and switch between message branches.
- Streaming replies, deep thinking, smart search, link reading, and source citations; stop generation or continue eligible replies.
- Upload, paste, or drag and drop attachments; use voice input and read replies aloud. A live audio spectrum appears in the first row of the input area while recording on mobile.
- Markdown, syntax highlighting, KaTeX math, and Mermaid diagrams. Diagrams zoom and export to PNG, SVG, or source; images open in a full-screen viewer.
- Model and reasoning-effort picker in the composer, plus additional API providers in Settings with per-provider enable switches and model discovery from [models.dev](https://models.dev).
- Optional content safety check (`safety_check`); refused replies keep whatever text was streamed and show a notice with the reason instead of being discarded.
- Simplified Chinese and English, light and dark themes, mobile layouts, location settings, and chat history import and export.

## Changes from upstream

- History import reads the ZIP central directory in one pass and reuses the result for the same `File`, instead of issuing several async reads per entry.
- History import writes sessions to the staging store in batches of 128 entries / 8 MB; a 1694-chat (42.6 MB) archive went from about 224 s to about 90 s on the development device.
- History import shows a progress dialog: the bar follows the session count and each session and attachment is logged as it is processed (read-only textarea, last 300 lines, auto-scrolled).
- The repository entry and QR code point to this repository.

## Data and storage

Your API key and settings are stored in the browser's localStorage. Conversations and original attachments are stored in IndexedDB. Local data is isolated by browser profile and site origin. Sending messages, uploading attachments, and using speech features sends the relevant content to the configured API service.

Settings → Account → Model providers lets you add compatible endpoints. Their keys stay in localStorage, and the composer sends a request to the selected provider's own endpoint. Model names, vendor logos, and reasoning-capability metadata come from the public [models.dev](https://models.dev) catalog; that catalog call is the only request this app makes that does not go to your configured API service.

History import and export in Settings use ZIP archives. After confirmation and successful validation, importing replaces all local conversations and attachments. Exports include conversations and locally available original images, but exclude API keys, settings, and original non-image attachments. See the [history import/export documentation (Chinese)](src/services/chat/history/README.md) for the archive format and preservation details.

Settings → Data → Delete all chats clears all local conversations, original attachments, and unsent drafts after confirmation. It stops ongoing replies and returns to a new chat. Your API key and settings are preserved; files already uploaded to the API service are not deleted.

## Development

| Command       | Description                  |
| ------------- | ---------------------------- |
| `pnpm dev`    | Start the development server |
| `pnpm build`  | Build into `dist/`           |
| `pnpm type`   | Run TypeScript type checks   |
| `pnpm lint`   | Lint with oxlint             |
| `pnpm format` | Format with oxfmt            |

[rspack.config.ts](rspack.config.ts) uses `https://api.deepseek.com` by default. Use `createConfig({ apiOrigin, devServer, repoUrl })` to customize the API origin, the development server proxy, and the repository QR entry link.

Chat uses `deepseek-flash` by default through Anthropic-compatible Messages / Files APIs. Speech features use ASR / TTS endpoints. Requests include extensions for search, link reading, titles, and `latest_reminder`, so the configured service must support the corresponding capabilities. Supported attachment formats are determined by server-side validation.

```text
src/
  app/                 Application layout, themes, and global styles
  components/          Chat, settings, Markdown, and other UI components
  i18n/                English and Chinese translations
  services/
    api/               API requests, SSE, and protocol types
    chat/              Conversations, message branches, storage, and history import/export
    markdown/          Markdown parsing, syntax highlighting, and diagrams
    speech/            Audio recording and read-aloud playback
  utils/               Shared utilities
```

## References

The import performance and progress work was informed by a few sibling projects, all based on [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo):

- [xsqxyss-jpg/fakeseek](https://github.com/xsqxyss-jpg/fakeseek): added an import progress bar, a storage-quota warning, and a pre-import session picker.
- [Dingh0208/deepstay](https://github.com/Dingh0208/deepstay) and [leezzou/deepchat](https://github.com/leezzou/deepchat): replaced per-session staging writes with batched `addStagingSessions`.

This repository reimplements those ideas; no code was copied from them.

## Acknowledgements

- [hmjz100/deepseek-chat-demo](https://github.com/hmjz100/deepseek-chat-demo) — the direct upstream of this fork.
- [DeepSeek](https://www.deepseek.com/) — the open-source chat web UI.

## License

[MIT](LICENSE). The build copies the license to `dist/LICENSE`; include it when distributing the app. Third-party dependencies are subject to their own licenses.
