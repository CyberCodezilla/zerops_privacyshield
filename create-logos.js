const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'public', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const logos = {
  'chatgpt.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" preserveAspectRatio="xMidYMid meet">
  <path fill="#10a37f" d="M85.5 40.8A23.8 23.8 0 0 0 83.4 21a24 24 0 0 0-26-11.5 24 24 0 0 0-16.6-5.1 24 24 0 0 0-19.3 13.3 23.9 23.9 0 0 0-13.3 23.6A24.1 24.1 0 0 0 10.6 65a24 24 0 0 0 26 11.5 24.1 24.1 0 0 0 16.5 5.1A24.1 24.1 0 0 0 72.5 68.3 23.9 23.9 0 0 0 85.8 44.7a24 24 0 0 0-.3-3.9zM49.6 90.9a17.8 17.8 0 0 1-11.4-4.1l.6-.3 15.9-9.2a3.2 3.2 0 0 0 1.6-2.7V52.2l8 4.6a.3.3 0 0 1 .2.2v22.2a17.9 17.9 0 0 1-14.9 11.7zm-29.8-34.5a17.8 17.8 0 0 1-1.8-12l.6.3 15.8 9.1a3.2 3.2 0 0 0 3.1 0l23.3-13.4v9.2a.3.3 0 0 1-.2.2l-19.2 11.1a17.9 17.9 0 0 1-21.6-4.5zm-6.1-34.6A17.8 17.8 0 0 1 23 15.3l0 .6v18.4a3.2 3.2 0 0 0 1.6 2.7l23.3 13.5-8 4.6a.3.3 0 0 1-.3 0L20.4 44a17.9 17.9 0 0 1-6.7-22.2zm55.3-12.2a17.8 17.8 0 0 1 11.4 4.1l-.6.3-15.8 9.1a3.2 3.2 0 0 0-1.6 2.7v22.4l-8-4.6a.3.3 0 0 1-.2-.2V15.7A17.9 17.9 0 0 1 69 9.6zM31 29.1l8 4.6a.3.3 0 0 1 .2.2v22.4a17.9 17.9 0 0 1 29.9-13.4l-.6-.3-15.8-9.1a3.2 3.2 0 0 0-3.1 0L26.3 37l8.1 4.6a.3.3 0 0 1 .2.2h25.7a17.9 17.9 0 0 1 12 18.9zM49.6 57l-13.4-7.7 13.4-7.7 13.4 7.7z"/>
</svg>`,

  'claude.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" preserveAspectRatio="xMidYMid meet">
  <rect width="100" height="100" rx="22" fill="#d97757"/>
  <path d="M50 10 C47.5 10 45 12.5 45 15 V42.5 L25 22.5 C23.3 20.8 20.5 20.8 18.8 22.5 C17.1 24.2 17.1 27 18.8 28.7 L38.8 48.7 H10 C7.5 48.7 5 51.2 5 53.7 C5 56.2 7.5 58.7 10 58.7 H38.8 L18.8 78.7 C17.1 80.4 17.1 83.2 18.8 84.9 C20.5 86.6 23.3 86.6 25 84.9 L45 64.9 V90 C45 92.5 47.5 95 50 95 C52.5 95 55 92.5 55 90 V64.9 L75 84.9 C76.7 86.6 79.5 86.6 81.2 84.9 C82.9 83.2 82.9 80.4 81.2 78.7 L61.2 58.7 H90 C92.5 58.7 95 56.2 95 53.7 C95 51.2 92.5 48.7 90 48.7 H61.2 L81.2 28.7 C82.9 27 82.9 24.2 81.2 22.5 C79.5 20.8 76.7 20.8 75 22.5 L55 42.5 V15 C55 12.5 52.5 10 50 10 Z" fill="#ffffff"/>
</svg>`,

  'gemini.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" preserveAspectRatio="xMidYMid meet">
  <defs>
    <linearGradient id="geminiSparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1ba0f2"/>
      <stop offset="50%" stop-color="#9b72cb"/>
      <stop offset="100%" stop-color="#d96570"/>
    </linearGradient>
  </defs>
  <path d="M50 5 C50 29.85 29.85 50 5 50 C29.85 50 50 70.15 50 95 C50 70.15 70.15 50 95 50 C70.15 50 50 29.85 50 5 Z" fill="url(#geminiSparkleGrad)"/>
</svg>`,

  'perplexity.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" preserveAspectRatio="xMidYMid meet">
  <rect width="100" height="100" rx="22" fill="#202b36"/>
  <path d="M50 15 L20 30 V70 L50 85 L80 70 V30 Z" fill="none" stroke="#22d3ee" stroke-width="6" stroke-linejoin="round"/>
  <path d="M50 15 V85 M20 30 L80 70 M80 30 L20 70" fill="none" stroke="#22d3ee" stroke-width="5"/>
</svg>`,

  'deepseek.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" preserveAspectRatio="xMidYMid meet">
  <rect width="100" height="100" rx="22" fill="#4d6bfe"/>
  <circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" stroke-width="8"/>
  <path d="M25 50 Q50 25 75 50 Q50 75 25 50 Z" fill="#ffffff"/>
  <circle cx="50" cy="50" r="8" fill="#4d6bfe"/>
</svg>`
};

Object.entries(logos).forEach(([filename, svgContent]) => {
  const filePath = path.join(assetsDir, filename);
  fs.writeFileSync(filePath, svgContent);
  console.log(`Saved ${filename} to ${filePath}`);
});
