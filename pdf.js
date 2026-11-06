// JPEG 이미지 여러 장을 A4 PDF 한 파일로 묶습니다.
const te = new TextEncoder();
export function buildPdf(pages) { // pages: [{ bytes: Uint8Array, w, h }]
  const parts = [], offs = []; let pos = 0;
  const put = b => { const u = typeof b === "string" ? te.encode(b) : b; parts.push(u); pos += u.length; };
  const open = n => { offs[n] = pos; put(`${n} 0 obj\n`); };
  put("%PDF-1.4\n");
  const n = pages.length, kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  open(1); put("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  open(2); put(`<< /Type /Pages /Count ${n} /Kids [${kids}] >>\nendobj\n`);
  pages.forEach((p, i) => {
    const a = 3 + i * 3, c = `q 595.28 0 0 841.89 0 0 cm /Im0 Do Q`;
    open(a); put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents ${a + 1} 0 R /Resources << /XObject << /Im0 ${a + 2} 0 R >> >> >>\nendobj\n`);
    open(a + 1); put(`<< /Length ${c.length} >>\nstream\n${c}\nendstream\nendobj\n`);
    open(a + 2); put(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`); put(p.bytes); put("\nendstream\nendobj\n");
  });
  const total = 3 + n * 3, xref = pos;
  put(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let i = 1; i < total; i++) put(String(offs[i]).padStart(10, "0") + " 00000 n \n");
  put(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: "application/pdf" });
}
