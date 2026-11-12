# Zmind

A local-first mind mapping desktop app inspired by XMind, built with Tauri 2 + Vue 3.

## Author

Yao Zhang — xzhangyao@126.com

## Tech Stack

- **Desktop framework**: Tauri 2 (Rust)
- **Frontend**: Vue 3 + TypeScript + Vite
- **State management**: Pinia + Immer (introduced in M1)
- **UI**: Tailwind CSS 4 + shadcn-vue + Reka UI
- **Testing**: Vitest + @testing-library/vue + Playwright

## Requirements

- Node.js 20+
- pnpm
- Rust (stable, MSVC toolchain)
- Visual Studio Build Tools (Desktop development with C++)
- Windows 10 1809+, WebView2 Runtime

> In mainland China, `.cargo/config.toml` points crates.io to the rsproxy.cn mirror. You can delete that file if you don't need it.

## Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Start the frontend dev server
pnpm tauri dev      # Start the desktop app
pnpm build          # Type check + frontend build
pnpm tauri build    # Build the Windows installer
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm test           # Vitest (watch mode)
pnpm test:run       # Vitest (single run)
pnpm test:e2e       # Playwright smoke tests
pnpm package:installer  # Build the NSIS installer
pnpm package:portable   # Build the portable zip
pnpm package:windows    # Build both installer and portable package
```

## Packaging and Release

- **NSIS installer**: `pnpm package:installer`, output in `src-tauri/target/release/bundle/nsis/`.
- **Portable build**: `pnpm package:portable`, output in `release/Zmind-<version>-portable.zip`.
- **Build both**: `pnpm package:windows`.
- The portable package contains `Zmind.exe`, `portable.marker` and a README. On first launch it creates a `data/` directory next to the executable as the WebView2 user data directory, so nothing is written to the system user profile. The WebView2 Runtime must still be installed (usually included with Windows 10/11).
- Neither the installer nor the portable build is configured for auto-update; that optional feature is deferred for the first release.

## Project Structure

```
src/
├── domain/       # Document model, commands, layout, import/export
├── stores/       # Pinia stores
├── composables/  # Reusable composition logic
├── components/   # canvas / onboarding / system / inspector, etc.
├── lib/          # Tauri IPC wrappers and shared utilities
├── i18n/         # Chinese and English strings
├── styles/       # Global styles and theme variables
└── App.vue
e2e/              # Playwright smoke tests
scripts/          # Packaging scripts
src-tauri/        # Rust backend
```
