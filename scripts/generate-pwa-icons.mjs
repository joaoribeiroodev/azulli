/**
 * Gera ícones PWA a partir de assets/brand/azulli-logo.png
 * Uso: node scripts/generate-pwa-icons.mjs
 */
import { mkdir } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const root = path.resolve(import.meta.dirname, "..")
const source = path.join(root, "assets/brand/azulli-logo.png")
const pwaDir = path.join(root, "public/pwa")
const appDir = path.join(root, "src/app")

await mkdir(pwaDir, { recursive: true })

const sizes = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
]

for (const { file, size, maskable } of sizes) {
  if (maskable) {
    const inner = Math.round(size * 0.8)
    const pad = Math.round((size - inner) / 2)
    await sharp(source)
      .resize(inner, inner, {
        fit: "contain",
        background: { r: 5, g: 10, b: 48, alpha: 1 },
      })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 5, g: 10, b: 48, alpha: 1 },
      })
      .png()
      .toFile(path.join(pwaDir, file))
    continue
  }

  await sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 5, g: 10, b: 48, alpha: 1 },
    })
    .png()
    .toFile(path.join(pwaDir, file))
}

await sharp(source)
  .resize(32, 32, { fit: "contain", background: { r: 5, g: 10, b: 48, alpha: 1 } })
  .png()
  .toFile(path.join(appDir, "icon.png"))

await sharp(source)
  .resize(180, 180, { fit: "contain", background: { r: 5, g: 10, b: 48, alpha: 1 } })
  .png()
  .toFile(path.join(appDir, "apple-icon.png"))

console.log("PWA icons generated in public/pwa and src/app")
