const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const updateManagerPath = path.join(__dirname, '..', 'src', 'utils', 'updateManager.js');

if (!fs.existsSync(updateManagerPath)) {
  console.error("Xatolik: updateManager.js fayli topilmadi!");
  process.exit(1);
}

// 1. Faylni o'qish
let content = fs.readFileSync(updateManagerPath, 'utf8');
const versionRegex = /export const CURRENT_APP_VERSION = '(\d+)\.(\d+)\.(\d+)';/;
const match = content.match(versionRegex);

if (!match) {
  console.error("Xatolik: CURRENT_APP_VERSION topilmadi!");
  process.exit(1);
}

const major = parseInt(match[1], 10);
const minor = parseInt(match[2], 10);
const patch = parseInt(match[3], 10) + 1;
const newVersion = `${major}.${minor}.${patch}`;

// 2. Versiyani oshirib saqlash
content = content.replace(versionRegex, `export const CURRENT_APP_VERSION = '${newVersion}';`);
fs.writeFileSync(updateManagerPath, content, 'utf8');

const rawMsg = process.argv.slice(2).join(' ') || `Yangilanish v${newVersion}`;
const cleanMsg = rawMsg.replace(/["\\]/g, '');

console.log(`\n==========================================`);
console.log(`🚀 Yangi versiya: v${newVersion}`);
console.log(`📝 Izoh: "${cleanMsg}"`);
console.log(`📡 Bulutga (EAS Update) yuklanmoqda...`);
console.log(`==========================================\n`);

// 3. EAS Update buyrug'ini ishga tushirish
const isWin = process.platform === 'win32';
const easCmd = isWin ? 'npx.cmd' : 'npx';
const fullCommand = `${easCmd} eas-cli update --channel preview --platform android --message "v${newVersion}: ${cleanMsg}" --non-interactive`;

const env = { ...process.env, EAS_NO_VCS: '1' };

try {
  execSync(fullCommand, { stdio: 'inherit', env });
  console.log(`\n✅ Yangilanish v${newVersion} muvaffaqiyatli bulutga chiqdi!`);
  console.log(`📲 Foydalanuvchilar ilovani ochganda avtomatik v${newVersion} ga yangilanadi.\n`);
} catch (err) {
  console.error(`\n❌ Yangilanish yuklashda xatolik yuz berdi.`);
  process.exit(1);
}
