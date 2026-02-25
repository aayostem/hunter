import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function packageExtension() {
  try {
    const distDir = path.join(__dirname, '../dist');
    const chromeManifest = path.join(__dirname, '../manifest.chrome.json');
    const firefoxManifest = path.join(__dirname, '../manifest.firefox.json');
    
    // Package for Chrome (Manifest V3)
    const chromeZip = new AdmZip();
    chromeZip.addLocalFolder(distDir);
    
    if (await fs.pathExists(chromeManifest)) {
      chromeZip.addFile('manifest.json', await fs.readFile(chromeManifest));
    }
    chromeZip.writeZip(path.join(__dirname, '../chrome-extension.zip'));
    console.log('✅ Created Chrome package');
    
    // Package for Firefox (Manifest V2)
    const firefoxZip = new AdmZip();
    firefoxZip.addLocalFolder(distDir);
    
    if (await fs.pathExists(firefoxManifest)) {
      firefoxZip.addFile('manifest.json', await fs.readFile(firefoxManifest));
    }
    firefoxZip.writeZip(path.join(__dirname, '../firefox-extension.zip'));
    console.log('✅ Created Firefox package');
    
  } catch (error) {
    console.error('❌ Failed to package extension:', error);
    process.exit(1);
  }
}

packageExtension();