const res = await fetch('https://envirojim-final-deployment.vercel.app/api/admin/env-check');
const data = await res.json();
console.log('ENV CHECK STATUS:', res.status);
console.log(JSON.stringify(data, null, 2));
