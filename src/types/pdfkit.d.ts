declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: any);
    fontSize(size: number): PDFDocument;
    font(name: string): PDFDocument;
    text(text: string, x?: number, y?: number, options?: any): PDFDocument;
    moveDown(lines?: number): PDFDocument;
    moveTo(x: number, y: number): PDFDocument;
    lineTo(x: number, y: number): PDFDocument;
    stroke(): PDFDocument;
    addPage(options?: any): PDFDocument;
    end(): void;
    fillColor(color: string): PDFDocument;
    on(event: string, callback: (...args: any[]) => void): PDFDocument;
    y: number;
  }

  export default PDFDocument;
}
