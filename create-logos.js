const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'public', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const logos = {
  'chatgpt.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="#10a37f">
  <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.259 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7466-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0813 4.779-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4952 4.4953zM3.6047 18.3432a4.4755 4.4755 0 0 1-.5359-3.0146l.142.0854 4.7836 2.7582a.7948.7948 0 0 0 .7854 0l5.8352-3.368-2.02-1.1652a.071.071 0 0 1-.038-.052h-6.4478a4.504 4.504 0 0 1-3.0245-4.7562zm-1.854-10.428a4.4755 4.4755 0 0 1 2.34-1.9737l-.0047.1634 0 5.5164a.7948.7948 0 0 0 .3927.6813l5.8352 3.368-2.02 1.1686a.071.071 0 0 1-.0647 0l-5.5826-3.2234a4.504 4.504 0 0 1-1.096-6.7006zm16.597-3.6668a4.4755 4.4755 0 0 1 2.8765 1.0408l-.1419.0813-4.779 2.7582a.7948.7948 0 0 0-.3927.6813v6.7369l-2.02-1.1686a.071.071 0 0 1-.038-.052V8.7495a4.504 4.504 0 0 1 4.4951-4.4953zM8.5919 14.869l-2.02-1.1686a.071.071 0 0 1-.038-.052V8.0658a4.504 4.504 0 0 1 7.5197-3.368l-.142-.0854-4.7836-2.7582a.7948.7948 0 0 0-.7854 0L2.5074 5.2222l2.02 1.1652a.071.071 0 0 1 .038.052h6.4478a4.504 4.504 0 0 1 3.0245 4.7562zM12 14.2882l-3.368-1.9446 3.368-1.9447 3.368 1.9447z"/>
</svg>`,

  'claude.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="#d97757">
  <path d="M4.5 3h15a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-15A1.5 1.5 0 0 1 4.5 3zm8.25 4.5h-1.5v4.5H6.75v1.5h4.5v4.5h1.5v-4.5h4.5v-1.5h-4.5V7.5z"/>
</svg>`,

  'gemini.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
  <defs>
    <linearGradient id="geminiSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1ba0f2"/>
      <stop offset="50%" stop-color="#9b72cb"/>
      <stop offset="100%" stop-color="#d96570"/>
    </linearGradient>
  </defs>
  <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z" fill="url(#geminiSparkleGrad)"/>
</svg>`,

  'perplexity.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#22d3ee" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2L4 6V18L12 22L20 18V6L12 2Z"/>
  <path d="M12 2V22"/>
  <path d="M4 6L20 18"/>
  <path d="M20 6L4 18"/>
</svg>`,

  'deepseek.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="#4d6bfe">
  <path d="M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2M12 4A8 8 0 0 1 20 12A8 8 0 0 1 12 20A8 8 0 0 1 4 12A8 8 0 0 1 12 4M12 6A6 6 0 0 0 6 12A6 6 0 0 0 12 18A6 6 0 0 0 18 12A6 6 0 0 0 12 6Z"/>
</svg>`
};

Object.entries(logos).forEach(([filename, svgContent]) => {
  const filePath = path.join(assetsDir, filename);
  fs.writeFileSync(filePath, svgContent);
  console.log(`Saved ${filename} to ${filePath}`);
});
