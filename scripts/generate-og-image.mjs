import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const width = 1200;
const height = 630;

const logo = await sharp(path.join(root, "public/logo.webp"))
  .resize(96, 96, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const svg = Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="55%" stop-color="#0e7490"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="0" y="0" width="10" height="630" fill="#c0392b"/>
  <rect x="0" y="620" width="1200" height="10" fill="#facc15"/>
  <text x="210" y="145" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="#ffffff">ekonzo</text>
  <text x="80" y="280" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="600" fill="#fde047">Bons du Trésor de la RDC</text>
  <text x="80" y="350" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="rgba(255,255,255,0.88)">Souscrivez en ligne via Mobile Money</text>
  <text x="80" y="410" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="rgba(255,255,255,0.7)">Ministère des Finances · République Démocratique du Congo</text>
</svg>
`);

const out = path.join(root, "public/og-image.jpg");
await sharp(svg)
  .composite([{ input: logo, top: 80, left: 80 }])
  .jpeg({ quality: 88 })
  .toFile(out);

fs.copyFileSync(out, path.join(root, "src/app/opengraph-image.jpg"));
fs.copyFileSync(out, path.join(root, "src/app/twitter-image.jpg"));
console.log("OG image ready", fs.statSync(out).size);
