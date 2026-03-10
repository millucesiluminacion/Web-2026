const fs = require('fs');
const content = fs.readFileSync('src/pages/admin/ProductList.jsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('activeTab === \'variants\''));
if (startIndex !== -1) {
    for (let i = startIndex - 2; i < lines.length; i++) {
        console.log((i + 1) + ': ' + lines[i]);
    }
}
