// 외부 프로그램 없이 여러 시트가 있는 .xlsx 파일을 만듭니다 (압축하지 않은 zip).
const te = new TextEncoder();
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const u16 = n => [n & 255, n >> 8 & 255], u32 = n => [n & 255, n >> 8 & 255, n >> 16 & 255, n >>> 24 & 255];
function zip(files) {
  const parts = [], central = []; let off = 0;
  for (const [name, text] of files) {
    const nm = te.encode(name), data = te.encode(text), c = crc(data);
    const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(33), ...u32(c), ...u32(data.length), ...u32(data.length), ...u16(nm.length), ...u16(0)];
    const head = new Uint8Array([0x50, 0x4b, 3, 4, ...common, ...nm]);
    parts.push(head, data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off), ...nm]));
    off += head.length + data.length;
  }
  const cs = central.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cs), ...u32(off), 0, 0]);
  return new Blob([...parts, ...central, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
const x = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const colName = i => String.fromCharCode(65 + i);
const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
function sheetXml(sheet) {
  const body = sheet.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
    const ref = colName(ci) + (ri + 1), bold = ri === 0 || ri >= sheet.boldFrom;
    if (v === "" || v == null) return bold ? `<c r="${ref}" s="1"/>` : "";
    if (typeof v === "number") return `<c r="${ref}" s="${bold ? 3 : 2}"><v>${v}</v></c>`;
    return `<c r="${ref}"${bold ? ' s="1"' : ""} t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  }).join("")}</row>`).join("");
  const cols = `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`;
  return H + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${body}</sheetData></worksheet>`;
}
// sheets: [{ name, rows, widths, boldFrom }] — boldFrom부터는 합계 줄(굵게)
export function buildXlsx(sheets) {
  const S = sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]);
  return zip([
    ["[Content_Types].xml", H + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels", H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ["xl/workbook.xml", H + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${x(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", H + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", H + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="4"><xf/><xf fontId="1" applyFont="1"/><xf numFmtId="3" applyNumberFormat="1"/><xf numFmtId="3" fontId="1" applyNumberFormat="1" applyFont="1"/></cellXfs></styleSheet>'],
    ...S
  ]);
}
