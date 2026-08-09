const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'public', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const logos = {
  'chatgpt.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" rx="44" fill="#10a37f"/>
  <path d="M165.7 81.8a50 50 0 0 0-4.3-40.9 50.4 50.4 0 0 0-54.2-24.2 50.5 50.5 0 0 0-41.5-12.8 50.4 50.4 0 0 0-48.4 33.3 50.1 50.1 0 0 0-33.3 59.2 50.4 50.4 0 0 0 6.2 59.2 50.4 50.4 0 0 0 54.2 24.2 50.5 50.5 0 0 0 41.5 12.8 50.4 50.4 0 0 0 48.4-33.3 50.1 50.1 0 0 0 33.3-59.2 50.4 50.4 0 0 0-1.9-17.7zm-75.2 105.1a37.3 37.3 0 0 1-24-8.7l1.2-.7 39.8-23a6.6 6.6 0 0 0 3.3-5.7v-56.1l16.8 9.7a.6.6 0 0 1 .3.4v46.5a37.5 37.5 0 0 1-37.4 37.6zm-75.1-86.9a37.3 37.3 0 0 1 4.5-25.1l1.2.7 39.9 23a6.6 6.6 0 0 0 6.5 0l48.6-28.1v19.4a.6.6 0 0 1-.3.5l-40.3 23.3a37.5 37.5 0 0 1-53.7-20.7zm-15.4-87.1a37.3 37.3 0 0 1 19.5-16.4l0 1.4v46a6.6 6.6 0 0 0 3.3 5.7l48.6 28.1-16.8 9.7a.6.6 0 0 1-.5 0L14.7 114a37.5 37.5 0 0 1-9.7-55.9zm138.3-30.6a37.3 37.3 0 0 1 24 8.7l-1.2.7-39.8 23a6.6 6.6 0 0 0-3.3 5.7v56.1l-16.8-9.7a.6.6 0 0 1-.3-.4V39.9a37.5 37.5 0 0 1 37.4-37.6zm75.1 86.9a37.3 37.3 0 0 1-4.5 25.1l-1.2-.7-39.9-23a6.6 6.6 0 0 0-6.5 0L112.5 158v-19.4a.6.6 0 0 1 .3-.5l40.3-23.3a37.5 37.5 0 0 1 53.7 20.7zm15.4 87.1a37.3 37.3 0 0 1-19.5 16.4l0-1.4v-46a6.6 6.6 0 0 0-3.3-5.7l-48.6-28.1 16.8-9.7a.6.6 0 0 1 .5 0L185.3 86a37.5 37.5 0 0 1 9.7 55.9zM100 119.1 71.9 102.8 100 86.6l28.1 16.2z" fill="#fff"/>
</svg>`,

  'claude.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" rx="44" fill="#d97757"/>
  <path d="M128.5 45h-17.7l37.8 110h17.7zM71.5 45H53.8L91.6 155h17.7zM45 106.8h110v16.4H45z" fill="#ffffff"/>
  <circle cx="100" cy="72" r="14" fill="#ffffff"/>
  <circle cx="100" cy="128" r="14" fill="#ffffff"/>
</svg>`,

  'gemini.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" rx="44" fill="#1e1e24"/>
  <defs>
    <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1ba0f2"/>
      <stop offset="50%" stop-color="#9b72cb"/>
      <stop offset="100%" stop-color="#d96570"/>
    </linearGradient>
  </defs>
  <path d="M100 30 C100 68.66 68.66 100 30 100 C68.66 100 100 131.34 100 170 C100 131.34 131.34 100 170 100 C131.34 100 100 68.66 100 30 Z" fill="url(#geminiGrad)"/>
</svg>`,

  'perplexity.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" rx="44" fill="#202b36"/>
  <path d="M100 35 L45 65 V135 L100 165 L155 135 V65 Z" fill="none" stroke="#22d3ee" stroke-width="12" stroke-linejoin="round"/>
  <path d="M100 35 V165 M45 65 L155 135 M155 65 L45 135" fill="none" stroke="#22d3ee" stroke-width="10"/>
</svg>`,

  'deepseek.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <rect width="200" height="200" rx="44" fill="#4d6bfe"/>
  <circle cx="100" cy="100" r="55" fill="none" stroke="#ffffff" stroke-width="14"/>
  <path d="M60 100 Q100 60 140 100 Q100 140 60 100 Z" fill="#ffffff"/>
  <circle cx="100" cy="100" r="16" fill="#4d6bfe"/>
</svg>`
};

Object.entries(logos).forEach(([filename, svgContent]) => {
  const filePath = path.join(assetsDir, filename);
  fs.writeFileSync(filePath, svgContent);
  console.log(`Saved ${filename} to ${filePath}`);
});
