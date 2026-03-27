import fs from 'fs';
const stats = fs.statSync('C:\\Users\\Noé EVE\\OneDrive - Envirojim\\Bureau\\VB750 DK -1208 Instructions de service\\06 VB750DK-m2021 EU V Déplacement V110.pdf');
console.log(`FILE_SIZE: ${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`);
