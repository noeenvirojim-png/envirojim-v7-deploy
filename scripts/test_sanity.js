
console.log('HELLO FROM JS');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
console.log('DOTENV LOADED');
console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? 'EXISTS' : 'MISSING');
console.log('END OF SCRIPT');
