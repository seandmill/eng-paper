import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Page } from '../types';

export const exportToPdf = async (pages: Page[], fileName: string) => {
  if (pages.length === 0) return;

  // Ensure extension
  const finalName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  try {
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const element = document.getElementById(`engineering-paper-page-${page.id}`);
      
      if (!element) continue;

      // Add new page for subsequent iterations
      if (i > 0) {
        pdf.addPage();
      }

      // Increase scale for better quality
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f4f9f4', // Match the paper background
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }
    
    pdf.save(finalName);
  } catch (error) {
    console.error('Failed to export PDF', error);
    alert('Failed to export PDF. Please check console for details.');
  }
};