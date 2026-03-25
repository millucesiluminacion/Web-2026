const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!filePath.includes('node_modules')) filelist = walkSync(filePath, filelist);
        } else {
            if (filePath.match(/\.(js|jsx)$/)) {
                filelist.push(filePath);
            }
        }
    });
    return filelist;
}

const files = walkSync('C:/Users/Administrator/Desktop/Pagina Web/Web-2026/src');
let totalReplaced = 0;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('/search')) {
        let newContent = content.replace(/'\/search'/g, "'/catalogo'")
            .replace(/"\/search"/g, '"/catalogo"')
            .replace(/`\/search\?/g, '`/catalogo?')
            .replace(/'\/search\?/g, "'/catalogo?")
            .replace(/"\/search\?/g, '"/catalogo?');
        if (newContent !== content) {
            fs.writeFileSync(f, newContent);
            totalReplaced++;
            console.log('Updated', f);
        }
    }
});
console.log('Total files updated: ' + totalReplaced);
