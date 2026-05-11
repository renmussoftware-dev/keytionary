// One-shot icon generator. Reads the master logo, trims away its black
// borders so the subject fills the icon, and emits all the asset sizes
// app.json expects: iOS icon, splash, Android adaptive (foreground +
// background + monochrome), and the web favicon.
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SOURCE = join(root, 'assets', '_source-logo.png');
const ASSETS = join(root, 'assets');

// Pure black so the icon background blends seamlessly with the logo's own
// black backdrop. The splash screen's #0F0F11 is close enough that the
// transition between splash bg and icon body looks intentional.
const BG = '#000000';

// Trim threshold — anything brighter than ~4% counts as content. Just barely
// above pure black so we don't accidentally chop into the darker shadows.
const TRIM_THRESHOLD = 10;

// Crop the source to its content bounding box and return a buffer + dims.
// We do this once and reuse for every output target.
async function getTrimmedLogo() {
  const { data, info } = await sharp(SOURCE)
    .trim({ background: '#000000', threshold: TRIM_THRESHOLD })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

// Place the trimmed logo onto a square canvas of `size` pixels with `padPct`
// padding on each edge (0–1). If `bg` is omitted the padding is transparent
// (used for Android adaptive foreground where the launcher draws the
// background separately).
function placeOnSquare(logoBuf, size, padPct, bg) {
  const innerSize = Math.round(size * (1 - padPct * 2));
  const padBg = bg ?? { r: 0, g: 0, b: 0, alpha: 0 };
  return sharp(logoBuf)
    .resize(innerSize, innerSize, { fit: 'contain', background: padBg })
    .extend({
      top: Math.round((size - innerSize) / 2),
      bottom: Math.round((size - innerSize) / 2),
      left: Math.round((size - innerSize) / 2),
      right: Math.round((size - innerSize) / 2),
      background: padBg,
    });
}

async function main() {
  const srcMeta = await sharp(SOURCE).metadata();
  const trimmed = await getTrimmedLogo();
  console.log(`source: ${srcMeta.width}×${srcMeta.height} → trimmed: ${trimmed.width}×${trimmed.height}`);

  // iOS icon (1024 full bleed, opaque). ~3% padding keeps the subject from
  // touching the rounded-corner mask Apple applies on the home screen.
  await placeOnSquare(trimmed.buffer, 1024, 0.03, BG)
    .flatten({ background: BG })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(ASSETS, 'icon.png'));
  console.log('icon.png 1024×1024 ✓');

  // Splash icon — same prominence as the app icon. Splash backdrop already
  // gives it room; we don't want it postage-stamp sized.
  await placeOnSquare(trimmed.buffer, 1024, 0.08, BG)
    .flatten({ background: BG })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(ASSETS, 'splash-icon.png'));
  console.log('splash-icon.png 1024×1024 ✓');

  // Android adaptive foreground. The launcher masks the outer ~17% on every
  // edge with a shape mask (circle, squircle, etc.), so critical content
  // must live inside the inner 66%. ~20% padding leaves a hair of breathing
  // room past that and keeps the logo from getting visually clipped.
  await placeOnSquare(trimmed.buffer, 512, 0.2)
    .png({ compressionLevel: 9 })
    .toFile(join(ASSETS, 'android-icon-foreground.png'));
  console.log('android-icon-foreground.png 512×512 ✓');

  // Android adaptive background — solid brand bg.
  await sharp({
    create: { width: 512, height: 512, channels: 3, background: BG },
  })
    .png({ compressionLevel: 9 })
    .toFile(join(ASSETS, 'android-icon-background.png'));
  console.log('android-icon-background.png 512×512 ✓');

  // Android monochrome (themed icon, Android 13+). Launcher tints this with
  // the wallpaper accent, so we need a clean white-on-transparent silhouette
  // — NOT a faithful greyscale. Build the whole 432×432 RGBA buffer in JS so
  // sharp doesn't get a chance to mis-position any intermediate layers.
  const monoSize = 432;
  const monoInner = Math.round(monoSize * 0.7); // 70% of canvas → fits in safe zone
  const monoPad = Math.round((monoSize - monoInner) / 2);
  const lum = await sharp(trimmed.buffer)
    .resize(monoInner, monoInner, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
    .greyscale()
    .extractChannel('red')
    .raw()
    .toBuffer();
  const monoRgba = Buffer.alloc(monoSize * monoSize * 4); // all zeros = transparent black
  for (let y = 0; y < monoInner; y++) {
    for (let x = 0; x < monoInner; x++) {
      const srcIdx = y * monoInner + x;
      const dstIdx = ((y + monoPad) * monoSize + (x + monoPad)) * 4;
      const a = lum[srcIdx] >= 12 ? 255 : 0;
      monoRgba[dstIdx]     = 255;
      monoRgba[dstIdx + 1] = 255;
      monoRgba[dstIdx + 2] = 255;
      monoRgba[dstIdx + 3] = a;
    }
  }
  await sharp(monoRgba, { raw: { width: monoSize, height: monoSize, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(join(ASSETS, 'android-icon-monochrome.png'));
  console.log('android-icon-monochrome.png 432×432 ✓');

  // Web favicon — 48×48, tight margin so the subject is recognizable at the
  // small size.
  await placeOnSquare(trimmed.buffer, 48, 0.02, BG)
    .flatten({ background: BG })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(ASSETS, 'favicon.png'));
  console.log('favicon.png 48×48 ✓');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
