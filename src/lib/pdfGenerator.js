import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabaseClient';
import { parseOrderInvoiceMeta } from './orderTrackingUtils';

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
            const dataURL = canvas.toDataURL('image/png');
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
        doc.text('FICHA TÉCNICA', 190, currentY + 5, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(`Generada: ${new Date().toLocaleDateString('es-ES')}`, 190, currentY + 10, { align: 'right' });

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
        doc.setTextColor(27, 62, 188); // Primary Gold
        doc.text((product.categories?.name || 'BOUTIQUE SELECTION').toUpperCase() + ' // REF: ' + (displayProduct.reference || 'N/A'), col2X, infoCurrentY);

        infoCurrentY += 12;

        let sealX = col2X;
        // Render Energy Label
        if (product.energy_labels) {
            try {
                if (product.energy_labels.image_url) {
                    const elImg = await getBase64ImageFromURL(product.energy_labels.image_url);
                    doc.addImage(elImg, 'PNG', sealX, infoCurrentY, 12, 12);
                    sealX += 15;
                } else {
                    doc.setFontSize(7);
                    doc.setTextColor(255, 255, 255);
                    doc.setFillColor(product.energy_labels.color || '#000');
                    doc.rect(sealX, infoCurrentY, 10, 10, 'F');
                    doc.text(product.energy_labels.name, sealX + 5, infoCurrentY + 6.5, { align: 'center' });
                    sealX += 15;
                }
            } catch (e) { console.warn("Error adding energy label to PDF", e); }
        }

        // Render Quality Seals
        if (product.product_quality_seals && product.product_quality_seals.length > 0) {
            for (const pqs of product.product_quality_seals) {
                if (pqs.quality_seals?.image_url) {
                    try {
                        const sealImg = await getBase64ImageFromURL(pqs.quality_seals.image_url);
                        doc.addImage(sealImg, 'PNG', sealX, infoCurrentY, 10, 10);
                        sealX += 13;
                    } catch (e) { console.warn("Error adding quality seal to PDF", e); }
                }
            }
        }

        if (product.energy_labels || (product.product_quality_seals && product.product_quality_seals.length > 0)) {
            infoCurrentY += 15;
        }

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
        doc.text('TU TIENDA ESPECIALIZADA EN ILUMINACION LINEAL Y LED', margin, footerY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(27, 62, 188);
        doc.text('WWW.MILLUCESILUMINACION.COM', 190, footerY, { align: 'right' });

        // OPEN IN NEW TAB
        const string = doc.output('bloburl');
        window.open(string, '_blank');

    } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
    }
};

function formatPaymentMethodES(method) {
    const m = String(method || '').toLowerCase();
    if (m === 'stripe' || m === 'card' || m === 'tarjeta') return 'Tarjeta Bancaria (Stripe)';
    if (m === 'paypal') return 'PayPal';
    if (m === 'transfer' || m === 'transferencia') return 'Transferencia Bancaria';
    if (m === 'in_store' || m === 'tienda') return 'Pago en Tienda';
    return method ? String(method).toUpperCase() : 'Pago Confirmado';
}

/**
 * Genera y descarga el Ticket / Factura Simplificada de Compra Web (en PDF)
 * Válido para pedidos pagados en adelante. Las facturas completas oficiales se emiten desde el TPV.
 */
export const generateOrderTicketPDF = async (order, providedItems = null, options = {}) => {
    if (!order) throw new Error('No se encontraron los datos del pedido.');

    let items = Array.isArray(providedItems) && providedItems.length > 0 ? providedItems : (order.order_items || []);
    if (!items || items.length === 0) {
        const { data: fetchedItems } = await supabase
            .from('order_items')
            .select('*, products(reference)')
            .eq('order_id', order.id);
        items = fetchedItems || [];
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const margin = 18;
    const pageWidth = 210;
    const rightEdge = pageWidth - margin;
    let y = 18;

    const orderRef = (order.id || '').slice(0, 8).toUpperCase();
    const orderDate = order.created_at
        ? new Date(order.created_at).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : new Date().toLocaleDateString('es-ES');

    const { invoiceRequest } = parseOrderInvoiceMeta(order);
    const profile = options.profile || null;

    // 1. HEADER: Brand & Document Type
    try {
        const logoBase64 = await getBase64ImageFromURL(options.logoUrl || '/logo.jpg');
        doc.addImage(logoBase64, 'JPEG', margin, y, 36, 12);
    } catch (e) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(26, 26, 26);
        doc.text('MIL LUCES ILUMINACION', margin, y + 7);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(26, 26, 26);
    doc.text('FACTURA SIMPLIFICADA / TICKET', rightEdge, y + 4, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(27, 62, 188);
    doc.text(`Ref. Ticket: #${orderRef}`, rightEdge, y + 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text(`Fecha: ${orderDate}`, rightEdge, y + 15, { align: 'right' });

    // Company Subheader
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Mil Luces Iluminacion · IntegralPlas24 S.L.', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text('C/ Rio Tormes, 5, Local 3 · 28943 Fuenlabrada, Madrid · Tel: +34 917 654 062', margin, y + 4);

    // Status pill text
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(rightEdge - 28, y - 2, 28, 6.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52);
    doc.text('PAGADO', rightEdge - 14, y + 2.3, { align: 'center' });

    y += 10;
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.6);
    doc.line(margin, y, rightEdge, y);
    y += 8;

    // 2. CUSTOMER & SHIPPING COLUMNS
    const colWidth = (rightEdge - margin - 10) / 2;
    const col2X = margin + colWidth + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(27, 62, 188);
    doc.text('DATOS DEL CLIENTE', margin, y);
    doc.text('ENTREGA Y PAGO', col2X, y);

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(26, 26, 26);

    const displayCustomerName = invoiceRequest?.company_name || profile?.company_name || order.customer_name || profile?.full_name || 'Cliente Web';
    const displayVatId = invoiceRequest?.vat_id || profile?.vat_id || '';
    const displayFiscalAddress = invoiceRequest?.fiscal_address || '';

    doc.text(String(displayCustomerName).toUpperCase(), margin, y);

    let leftY = y + 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);

    if (displayVatId) {
        doc.setFont('helvetica', 'bold');
        doc.text(`NIF / CIF: ${displayVatId}`, margin, leftY);
        doc.setFont('helvetica', 'normal');
        leftY += 4.2;
    }
    if (order.customer_email) {
        doc.text(`Email: ${order.customer_email}`, margin, leftY);
        leftY += 4.2;
    }
    if (order.customer_phone) {
        doc.text(`Tel: ${order.customer_phone}`, margin, leftY);
        leftY += 4.2;
    }
    if (displayFiscalAddress) {
        const splitFiscal = doc.splitTextToSize(`Dir. Fiscal: ${displayFiscalAddress}`, colWidth);
        doc.text(splitFiscal, margin, leftY);
        leftY += splitFiscal.length * 4;
    }

    // Right column: Shipping & Payment
    let rightY = y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(26, 26, 26);

    if (order.shipping_method === 'pickup') {
        doc.text('RECOGIDA EN TIENDA (SHOWROOM)', col2X, rightY);
        rightY += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        doc.text('C/ Rio Tormes, 5, Local 3 · 28943 Fuenlabrada', col2X, rightY);
        rightY += 4.5;
    } else {
        doc.text('ENVIO A DOMICILIO', col2X, rightY);
        rightY += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        const addrLine = [order.shipping_address, [order.shipping_zip, order.shipping_city].filter(Boolean).join(' ')].filter(Boolean).join(' - ');
        if (addrLine) {
            const splitAddr = doc.splitTextToSize(addrLine, colWidth);
            doc.text(splitAddr, col2X, rightY);
            rightY += splitAddr.length * 4.2;
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`Metodo de pago: ${formatPaymentMethodES(order.payment_method)}`, col2X, rightY + 1);
    rightY += 6;

    y = Math.max(leftY, rightY) + 5;

    // 3. ITEMS TABLE
    const tableBody = items.map((item, idx) => {
        const unitPrice = Number(item.unit_price ?? item.price ?? 0);
        const qty = Number(item.quantity || 1);
        const lineTotal = unitPrice * qty;

        let concept = item.product_name || item.name || `Articulo #${idx + 1}`;
        const opts = [];
        if (item.selected_options && typeof item.selected_options === 'object') {
            Object.entries(item.selected_options).forEach(([k, v]) => {
                if (v != null && v !== '') {
                    opts.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
                }
            });
        }
        if (opts.length > 0) {
            concept += `\n(${opts.join(' · ')})`;
        }
        const ref = item.products?.reference || item.reference;
        if (ref) {
            concept += `\nREF: ${ref}`;
        }

        return [
            concept,
            `x${qty}`,
            `${unitPrice.toFixed(2)} €`,
            `${lineTotal.toFixed(2)} €`
        ];
    });

    autoTable(doc, {
        startY: y,
        head: [['CONCEPTO / ARTICULO', 'CANT.', 'PRECIO UD.', 'IMPORTE']],
        body: tableBody.length > 0 ? tableBody : [['Compra en Mil Luces Iluminacion', 'x1', `${Number(order.total || 0).toFixed(2)} €`, `${Number(order.total || 0).toFixed(2)} €`]],
        theme: 'grid',
        headStyles: {
            fillColor: [26, 26, 26],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 8.5,
            cellPadding: 3.5,
            font: 'helvetica',
            textColor: [40, 40, 40],
            lineColor: [235, 235, 235]
        },
        columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin }
    });

    let afterTableY = (doc.lastAutoTable?.finalY || y + 30) + 8;
    if (afterTableY > 230) {
        doc.addPage();
        afterTableY = 20;
    }

    // 4. TOTALS SUMMARY BOX
    const orderTotal = Number(order.total || 0);
    const itemsSubtotal = items.reduce((acc, it) => acc + (Number(it.unit_price ?? it.price ?? 0) * Number(it.quantity || 1)), 0);
    const diff = Number((orderTotal - itemsSubtotal).toFixed(2));
    const shippingVal = order.shipping_method === 'pickup' ? 0 : (diff > 0 ? diff : 0);
    const discountVal = diff < 0 ? Math.abs(diff) : 0;

    const baseImponible = orderTotal / 1.21;
    const ivaAmount = orderTotal - baseImponible;

    const boxWidth = 82;
    const boxX = rightEdge - boxWidth;
    let boxY = afterTableY;

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(boxX, boxY, boxWidth, 42, 2.5, 2.5, 'FD');

    let rowY = boxY + 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    if (items.length > 0) {
        doc.text('Subtotal Articulos:', boxX + 4, rowY);
        doc.text(`${itemsSubtotal.toFixed(2)} €`, rightEdge - 4, rowY, { align: 'right' });
        rowY += 5;
    }

    if (discountVal > 0.01) {
        doc.setTextColor(22, 163, 74);
        doc.text('Descuento Aplicado:', boxX + 4, rowY);
        doc.text(`-${discountVal.toFixed(2)} €`, rightEdge - 4, rowY, { align: 'right' });
        doc.setTextColor(100, 100, 100);
        rowY += 5;
    } else {
        doc.text('Gastos de Envio:', boxX + 4, rowY);
        doc.text(shippingVal === 0 ? 'GRATIS (0.00 €)' : `${shippingVal.toFixed(2)} €`, rightEdge - 4, rowY, { align: 'right' });
        rowY += 5;
    }

    doc.text('Base Imponible (sin IVA):', boxX + 4, rowY);
    doc.text(`${baseImponible.toFixed(2)} €`, rightEdge - 4, rowY, { align: 'right' });
    rowY += 5;

    doc.text('IVA (21%):', boxX + 4, rowY);
    doc.text(`${ivaAmount.toFixed(2)} €`, rightEdge - 4, rowY, { align: 'right' });
    rowY += 4;

    doc.setDrawColor(210, 210, 210);
    doc.line(boxX + 4, rowY, rightEdge - 4, rowY);
    rowY += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text('TOTAL TICKET (IVA INC.):', boxX + 4, rowY);
    doc.setFontSize(11.5);
    doc.setTextColor(27, 62, 188);
    doc.text(`${orderTotal.toFixed(2)} €`, rightEdge - 4, rowY, { align: 'right' });

    // 5. LEGAL / TPV FOOTER NOTE
    const footerY = 274;
    doc.setDrawColor(235, 235, 235);
    doc.line(margin, footerY - 5, rightEdge, footerY - 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text('JUSTIFICANTE DE COMPRA / TICKET SIMPLIFICADO WEB (IVA 21% INCLUIDO)', margin, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    const legalLines = doc.splitTextToSize(
        'Documento simplificado emitido por la tienda online como comprobante de pago y garantia. Las facturas completas oficiales para profesionales y empresas se emiten desde nuestro sistema TPV con los datos fiscales solicitados.',
        rightEdge - margin
    );
    doc.text(legalLines, margin, footerY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(27, 62, 188);
    doc.text('WWW.MILLUCESILUMINACION.COM · milluces@millucesiluminacion.com', margin, footerY + 12);

    doc.save(`Ticket-MilLuces-${orderRef}.pdf`);
};

