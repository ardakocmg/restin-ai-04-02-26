import { toJpeg, toPng } from 'html-to-image';
import jsPDF from 'jspdf';

/**
 * Utility to export a DOM element to PDF or JPEG
 */

export const exportToPdf = async (elementId, fileName = 'document.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }

    try {
        const dataUrl = await toPng(element, {
            quality: 1.0,
            pixelRatio: 2, // Higher resolution
            backgroundColor: '#ffffff'
        });

        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(fileName);
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
};

export const exportToJpeg = async (elementId, fileName = 'document.jpg') => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }

    try {
        const dataUrl = await toJpeg(element, {
            quality: 0.95,
            pixelRatio: 2,
            backgroundColor: '#ffffff'
        });

        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error('Error generating JPEG:', error);
    }
};

export const exportToCsv = (data, fileName = 'export.csv') => {
    if (!data || !data.length) {
        console.error('No data provided for CSV export');
        return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const cell = row[header] === null || row[header] === undefined ? '' : row[header];
            const cellStr = String(cell).replace(/"/g, '""');
            return `"${cellStr}"`;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
