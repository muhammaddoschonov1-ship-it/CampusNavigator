const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const toolsDir = path.join(__dirname, '..', 'tools');
const gitDir = path.join(toolsDir, 'git');
const gitExe = path.join(gitDir, 'cmd', 'git.exe');
const zipFile = path.join(toolsDir, 'mingit.zip');

if (fs.existsSync(gitExe)) {
  console.log('✅ Git allaqachon mavjud:', gitExe);
  try {
    const version = execSync(`"${gitExe}" --version`, { encoding: 'utf8' }).trim();
    console.log('Versiya:', version);
  } catch (e) {}
  process.exit(0);
}

if (!fs.existsSync(toolsDir)) {
  fs.mkdirSync(toolsDir, { recursive: true });
}

const downloadUrl = 'https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/MinGit-2.44.0-64-bit.zip';

console.log('📥 MinGit yuklab olinmoqda...');

function download(url, dest, cb) {
  const file = fs.createWriteStream(dest);
  const request = (targetUrl) => {
    https.get(targetUrl, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return request(res.headers.location);
      }
      if (res.statusCode !== 200) {
        cb(new Error(`Server javobi: ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(cb);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      cb(err);
    });
  };
  request(url);
}

download(downloadUrl, zipFile, (err) => {
  if (err) {
    console.error('❌ Yuklab olishda xatolik:', err.message);
    process.exit(1);
  }
  console.log('📦 MinGit arxivdan chiqarilmoqda...');
  try {
    execSync(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${gitDir}' -Force"`, { stdio: 'inherit' });
    if (fs.existsSync(zipFile)) {
      fs.unlinkSync(zipFile);
    }
    const version = execSync(`"${gitExe}" --version`, { encoding: 'utf8' }).trim();
    console.log('🎉 Git muvaffaqiyatli o\'rnatildi:', version);
  } catch (extractErr) {
    console.error('Arxivdan chiqarishda xatolik:', extractErr.message);
    process.exit(1);
  }
});
