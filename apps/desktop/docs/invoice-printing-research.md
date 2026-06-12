# Invoice Printing Research

## Sample PDF Observations

- Source file: `/Users/nileshinkane/Downloads/print2.pdf`
- Metadata: one A4 page, created by DOSPrinter and Microsoft Print To PDF.
- Page size: 595.32 x 841.92 pt, which is A4 portrait.
- Layout: two invoice copies on one A4 sheet.
- Rendering style: fixed-width text with box-drawing characters, not a modern table layout.
- Print character set: uses line characters such as `╔`, `═`, `╤`, `║`, `╪`, and `╧`.
- Font style: condensed monospaced text, close to DOS/dot-matrix output.

## Implementation Direction

The editor should be a normal desktop form with an editable line-item table. The print/export
surface should be generated from the invoice data as deterministic fixed-width text.

This gives us two useful outputs from the same data:

- A screen-friendly table UI for invoice entry.
- A printer-friendly monospaced invoice body for PDF, inkjet, and dot-matrix printer drivers.

## Printer Compatibility Notes

- Epson ESC/P was designed for dot-matrix printer control, and the ESC/P reference manual
  lists page format, margins, line spacing, fixed-pitch font selection, condensed mode, and
  character table controls. That matters if we later add raw dot-matrix output.
- For the current Tauri app, the practical first step is print CSS plus `window.print()`.
  That allows Microsoft Print to PDF, inkjet drivers, and dot-matrix drivers to receive the
  same fixed-width invoice layout through the system print dialog.
- For stricter dot-matrix compatibility, we should add an ASCII-safe output mode using
  `+`, `-`, and `|`, because some printer/font/code-page paths may not preserve Unicode
  box drawing.
- For direct raw printing later, generate ESC/P text separately from the PDF/print-preview
  path. That future path should set page length, line spacing, fixed pitch, condensed mode,
  and character table before sending raw text bytes to the printer.

## References

- Epson ESC/P Reference Manual: https://files.support.epson.com/pdf/general/escp2ref.pdf
- MDN `@page`: https://developer.mozilla.org/en-US/docs/Web/CSS/@page
- MDN Printing CSS guide: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Printing
- PDFKit standard fonts and Courier support: https://pdfkit.org/docs/text.html#fonts
