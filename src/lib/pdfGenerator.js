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
        // 1. ADD LOGO
        try {
            const logoBase64 = await getBase64ImageFromURL(logoUrl);
            doc.addImage(logoBase64, 'JPEG', margin, currentY, 40, 15);
        } catch (e) {
            console.warn("Could not load logo for PDF", e);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('MIL LUCES', margin, currentY + 10);
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const dateStr = new Date().toLocaleDateString('es-ES');
        doc.text(`Fecha: ${dateStr}`, 190, currentY + 8, { align: 'right' });

        currentY += 25;

        // 2. PRODUCT TITLE & CATEGORY
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, currentY, 190, currentY);
        currentY += 15;

        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 26, 26); // Brand Carbon
        const title = displayProduct.name.toUpperCase();
        const splitTitle = doc.splitTextToSize(title, 170);
        doc.text(splitTitle, margin, currentY);
        currentY += (splitTitle.length * 10);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(product.categories?.name || 'Colección Exclusive', margin, currentY);
        currentY += 10;

        // 3. MAIN IMAGE
        if (displayProduct.image_url) {
            try {
                const productImgBase64 = await getBase64ImageFromURL(displayProduct.image_url);
                // Center image
                const imgWidth = 80;
                const imgHeight = 80;
                doc.addImage(productImgBase64, 'JPEG', (210 - imgWidth) / 2, currentY, imgWidth, imgHeight);
                currentY += imgHeight + 10;
            } catch (e) {
                console.warn("Could not load product image for PDF", e);
                currentY += 20;
            }
        }

        // 4. DESCRIPTION
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const description = displayProduct.description || product.description || '';
        const splitDesc = doc.splitTextToSize(description, 170);
        doc.text(splitDesc, margin, currentY);
        currentY += (splitDesc.length * 6) + 10;

        // 5. SPECIFICATIONS TABLE
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(189, 151, 88); // Primary Gold-ish (Approx)
        doc.text('ESPECIFICACIONES TÉCNICAS', margin, currentY);
        currentY += 8;

        const attributes = { ...product.attributes, ...variant?.attributes };
        const tableRows = [
            ['Referencia', displayProduct.reference || '---']
        ];

        Object.entries(attributes).forEach(([key, value]) => {
            const displayValue = Array.isArray(value) ? value.join(', ') : value;
            tableRows.push([key, displayValue]);
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Característica', 'Detalle']],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [26, 26, 26],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 10,
                cellPadding: 4
            },
            margin: { left: margin, right: margin }
        });

        // 6. FOOTER
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(
                'Ficha técnica generada por Mil Luces Boutique - www.mil-luces.com',
                105,
                285,
                { align: 'center' }
            );
        }

        // SAVE PDF
        const filename = `Ficha_Tecnica_${displayProduct.name.replace(/\s+/g, '_')}.pdf`;
        doc.save(filename);

    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    }
};
