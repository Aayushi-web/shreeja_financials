const bcrypt = require('bcrypt');

async function generateHash() {
    const hash = await bcrypt.hash('Investor@123', 10);
    console.log('Hash:', hash);
}

generateHash();