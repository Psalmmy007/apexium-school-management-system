import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.resolve(__dirname, "../public");
const APP_DIR = path.resolve(__dirname, "../src/app");

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="apexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#3730A3" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#apexGrad)" />
  <g fill="#FFFFFF" transform="translate(64, 64) scale(16)">
    <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3ZM5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z" />
  </g>
</svg>`;

async function generateIcons() {
  // 1. Write SVG files
  fs.writeFileSync(path.join(PUBLIC_DIR, "favicon.svg"), svgContent);
  fs.writeFileSync(path.join(PUBLIC_DIR, "icon.svg"), svgContent);
  console.log("✅ Wrote favicon.svg and icon.svg");

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

  const browser = await chromium.launch();
  
  const sizes = [
    { name: "favicon-16x16.png", size: 16 },
    { name: "favicon-32x32.png", size: 32 },
    { name: "icon.png", size: 32 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
  ];

  for (const item of sizes) {
    const page = await browser.newPage({
      viewport: { width: item.size, height: item.size },
      deviceScaleFactor: 2,
    });
    await page.setContent(html);
    const dest = path.join(PUBLIC_DIR, item.name);
    await page.screenshot({ path: dest, omitBackground: true });
    console.log(`✅ Generated ${item.name} (${item.size}x${item.size})`);
    await page.close();
  }

  // Generate favicon.ico (using the 32x32 PNG as ico)
  fs.copyFileSync(
    path.join(PUBLIC_DIR, "favicon-32x32.png"),
    path.join(PUBLIC_DIR, "favicon.ico")
  );
  fs.copyFileSync(
    path.join(PUBLIC_DIR, "favicon-32x32.png"),
    path.join(APP_DIR, "favicon.ico")
  );
  console.log("✅ Created favicon.ico in public/ and src/app/");

  await browser.close();
}

generateIcons().catch(err => {
  console.error("Icon generation error:", err);
  process.exit(1);
});
