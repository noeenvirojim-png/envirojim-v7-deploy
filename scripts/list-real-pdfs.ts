import fs from 'fs';
import path from 'path';

function getPdfs(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getPdfs(filePath, fileList);
    } else if (file.toLowerCase().endsWith('.pdf')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const targetDir = 'C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service';
try {
  const pdfs = getPdfs(targetDir);
  console.log('PDFs_FOUND:');
  pdfs.forEach(p => console.log(p));
} catch (e: any) {
  console.error('ERROR:', e.message);
}
