/**
 * Utility functions for printing ELD logs
 */

/**
 * Prepares the page for printing ELD logs
 * This function adds a print-specific stylesheet and triggers the print dialog
 * 
 * @param title The title to display on the printed page
 */
export const printEldLogs = (title: string = 'ELD Logs'): void => {
  // Create a print-specific stylesheet
  const style = document.createElement('style');
  style.innerHTML = `
    @media print {
      body * {
        visibility: hidden;
      }
      
      .print-section, .print-section * {
        visibility: visible;
      }
      
      .print-section {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      
      .no-print {
        display: none !important;
      }
      
      @page {
        size: portrait;
        margin: 0.5in;
      }
      
      h1 {
        font-size: 18pt;
        margin-bottom: 12pt;
      }
      
      h2 {
        font-size: 16pt;
        margin-bottom: 10pt;
      }
      
      h3 {
        font-size: 14pt;
        margin-bottom: 8pt;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16pt;
      }
      
      th, td {
        border: 1px solid #ddd;
        padding: 8pt;
        text-align: left;
      }
      
      th {
        background-color: #f2f2f2;
      }
    }
  `;
  
  // Add the stylesheet to the document
  document.head.appendChild(style);
  
  // Set the document title for the print dialog
  const originalTitle = document.title;
  document.title = title;
  
  // Trigger the print dialog
  window.print();
  
  // Clean up
  setTimeout(() => {
    document.head.removeChild(style);
    document.title = originalTitle;
  }, 1000);
};

/**
 * Adds the print-section class to an element to make it visible during printing
 * 
 * @param elementId The ID of the element to make printable
 */
export const makePrintable = (elementId: string): void => {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.add('print-section');
  }
}; 