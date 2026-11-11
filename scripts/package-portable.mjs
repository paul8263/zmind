import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skipBuild = process.argv.includes('--skip-build')

if (!skipBuild) {
  execFileSync('pnpm', ['tauri', 'build', '--no-bundle'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = packageJson.version
const executable = join(root, 'src-tauri', 'target', 'release', 'zmind.exe')
if (!existsSync(executable)) {
  throw new Error(`Release executable not found: ${executable}`)
}

const outputDirectory = join(root, 'release', `Zmind-${version}-portable`)
rmSync(outputDirectory, { recursive: true, force: true })
mkdirSync(outputDirectory, { recursive: true })

copyFileSync(executable, join(outputDirectory, 'Zmind.exe'))
writeFileSync(join(outputDirectory, 'portable.marker'), '')
copyFileSync(join(root, 'README.md'), join(outputDirectory, 'README.md'))

const webViewLoader = join(root, 'src-tauri', 'target', 'release', 'WebView2Loader.dll')
if (existsSync(webViewLoader)) {
  copyFileSync(webViewLoader, join(outputDirectory, 'WebView2Loader.dll'))
}

const archive = join(root, 'release', `Zmind-${version}-portable.zip`)
rmSync(archive, { force: true })
if (process.platform === 'win32') {
  execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '${outputDirectory}\\*' -DestinationPath '${archive}' -Force`,
    ],
    { cwd: root, stdio: 'inherit' },
  )
} else {
  execFileSync('zip', ['-r', archive, '.'], { cwd: outputDirectory, stdio: 'inherit' })
}

console.log(`Portable build: ${archive}`)
