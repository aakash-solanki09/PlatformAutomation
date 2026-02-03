const pdfModule = require('pdf-parse');

async function test() {
    try {
        if (pdfModule.PDFParse) {
            const { PDFParse } = pdfModule;
            try {
                // Minimal PDF
                const validPdfBuffer = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 21 >>
stream
BT /F1 12 Tf (Hello) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000060 00000 n
0000000117 00000 n
0000000219 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
290
%%EOF`);
                
                const parser = new PDFParse({ data: validPdfBuffer });
                console.log('Parser instantiated.');
                const result = await parser.getText();
                console.log('Result keys:', Object.keys(result));
                console.log('Result text preview:', result.text);
            } catch(e) {
                console.log('Execution error:', e);
            }
        }
    } catch (e) {
        console.log('Error:', e);
    }
}
test();
