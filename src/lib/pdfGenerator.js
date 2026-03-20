import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Helper to convert image URL to Base64
 */
const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg');
            resolve(dataURL);
        };
        img.onerror = (error) => {
            reject(error);
        };
        img.src = url;
    });
};

export const generateProductPDF = async (product, variant, logoUrl = '/logo.jpg') => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const displayProduct = variant || product;
    const margin = 20;
    let currentY = 20;

    try {
        // 1. HEADER & LOGO (Left: Logo, Right: Type)
        try {
            const logoBase64 = await getBase64ImageFromURL(logoUrl);
            doc.addImage(logoBase64, 'JPEG', margin, currentY, 35, 12);
        } catch (e) {
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('MIL LUCES', margin, currentY + 8);
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 180, 180);
        doc.text('DOCUMENTACIÓN TÉCNICA', 190, currentY + 5, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 190, currentY + 10, { align: 'right' });

        currentY += 20;
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, currentY, 190, currentY);
        currentY += 15;

        // 2. TWO-COLUMN LAYOUT (Left: Image, Right: Main Info)
        const col1Width = 80;
        const col2X = margin + col1Width + 10;

        // Image in Left Column
        if (displayProduct.image_url) {
            try {
                const productImgBase64 = await getBase64ImageFromURL(displayProduct.image_url);
                const imgSize = 70;
                doc.addImage(productImgBase64, 'JPEG', margin, currentY, imgSize, imgSize);
            } catch (e) {
                doc.setDrawColor(245, 245, 245);
                doc.rect(margin, currentY, 70, 70, 'F');
                doc.setFontSize(8);
                doc.text('Imagen no disponible', margin + 20, currentY + 35);
            }
        }

        // Info in Right Column
        const infoY = currentY + 5;
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 26, 26);
        const title = doc.splitTextToSize(displayProduct.name.toUpperCase(), 80);
        doc.text(title, col2X, infoY);

        let infoCurrentY = infoY + (title.length * 9);

        // Category Badge
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(189, 151, 88); // Primary Gold
        doc.text((product.categories?.name || 'BOUTIQUE SELECTION').toUpperCase() + ' // REF: ' + (displayProduct.reference || 'N/A'), col2X, infoCurrentY);

        infoCurrentY += 12;

        // Description
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        const description = displayProduct.description || product.description || '';
        const splitDesc = doc.splitTextToSize(description, 80);
        doc.text(splitDesc.slice(0, 8), col2X, infoCurrentY); // Limit lines to keep it one-page

        // 3. SPECIFICATIONS TABLE (Full Width)
        currentY += 80; // Move below columns

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 26, 26);
        doc.text('ESPECIFICACIONES', margin, currentY);
        currentY += 5;

        const attributes = { ...product.attributes, ...variant?.attributes };
        const tableRows = [];
        Object.entries(attributes).forEach(([key, value]) => {
            const displayValue = Array.isArray(value) ? value.join(', ') : value;
            tableRows.push([key.toUpperCase(), displayValue]);
        });

        autoTable(doc, {
            startY: currentY,
            head: [['PROPIEDAD', 'VALOR']],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [26, 26, 26],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                font: 'helvetica',
                lineColor: [245, 245, 245]
            },
            columnStyles: {
                0: { fontStyle: 'bold', width: 50, fillColor: [252, 252, 252] }
            },
            margin: { left: margin, right: margin }
        });

        // 4. FOOTER (Fixed at help)
        const footerY = 280;
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text('MIL LUCES BOUTIQUE // ILUMINACIÓN TÉCNICA Y DECORATIVA EXCLUSIVA', margin, footerY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(189, 151, 88);
        doc.text('WWW.MIL-LUCES.COM', 190, footerY, { align: 'right' });

        // OPEN IN NEW TAB
        const string = doc.output('bloburl');
        window.open(string, '_blank');

    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    }
};
