import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { stampUsesDate, stampUsesDepartment, type StampImageKey, type PctBox, type PagePctBoxes } from "@/types/distribution";

export { STAMP_IMAGE_KEYS, isStampImageKey, type StampImageKey, type PctBox } from "@/types/distribution";

const STAMP_FIELD_LAYOUT: Partial<Record<StampImageKey, {
  date: { x: number; y: number; width: number; height: number; textX: number };
  departmentTextX: number;
  color: ReturnType<typeof rgb>;
}>> = {
  // Coordinates match the source 311x304 stamp artwork.
  "1.Controlled.png": {
    date: { x: 105, y: 91, width: 84, height: 21, textX: 115.729 },
    departmentTextX: 130,
    color: rgb(0, 74 / 255, 173 / 255),
  },
  "2.Obsoleted.png": {
    date: { x: 107, y: 96, width: 85, height: 21, textX: 118.283 },
    departmentTextX: 112,
    color: rgb(1, 49 / 255, 48 / 255),
  },
};

async function loadStampImageBytes(key: StampImageKey): Promise<Buffer> {
  const bytes = await fs.readFile(path.join(process.cwd(), "public", "stamp", key));
  return /\.(webp|svg)$/i.test(key) ? sharp(bytes).png().toBuffer() : bytes;
}

// Draws the chosen stamp image onto every page of the PDF at `box`.
function boxForPage(boxes: PagePctBoxes, pageIndex: number): PctBox {
  if (!Array.isArray(boxes)) return boxes;
  return boxes[pageIndex] ?? boxes[boxes.length - 1] ?? { xPct: 0.65, yPct: 0.05, wPct: 0.2 };
}

export async function bakeStampImage(pdfBuffer: Buffer, stampImageKey: StampImageKey, box: PagePctBoxes): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const image = await pdfDoc.embedPng(await loadStampImageBytes(stampImageKey));

  const imgAspect = image.height / image.width;

  for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
    const pageBox = boxForPage(box, pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const widthPct = pageBox.wPct ?? 0.2;
    const drawWidth = pageWidth * widthPct;
    const drawHeight = drawWidth * imgAspect;
    const x = pageWidth * pageBox.xPct;
    // pdf-lib's y origin is bottom-left; box.yPct is measured from the top like on-screen coordinates
    const y = pageHeight * (1 - pageBox.yPct) - drawHeight;
    page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
  }

  const out = await pdfDoc.save();
  return Buffer.from(out);
}

// Draws Date/Copy-to text onto every page of the PDF at their configured boxes.
export async function bakeDynamicFields(
  pdfBuffer: Buffer,
  stampImageKey: string,
  stampBoxes: PagePctBoxes,
  fields: { text: string; box: PagePctBoxes }[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const stampBox = boxForPage(stampBoxes, pageIndex);
    const stampWidth = pageWidth * (stampBox.wPct ?? 0.2);
    const scale = stampWidth / 311;
    const layout = STAMP_FIELD_LAYOUT[stampImageKey as StampImageKey];
    const stampColor = layout?.color ?? rgb(0, 0, 0);
    const fixedFields = fields.filter((item) => {
      if (item.text.startsWith("Date:") && !stampUsesDate(stampImageKey)) return false;
      if (item.text.startsWith("Copy to:") && !stampUsesDepartment(stampImageKey)) return false;
      return true;
    });
    for (const field of fixedFields) {
      const isDepartment = field.text.startsWith("Copy to:");
      const xInStamp = isDepartment ? (layout?.departmentTextX ?? 112) : (layout?.date.textX ?? 111);
      // These are the top-left positions of the blank fields in the stamp
      // artwork. Keep them in artwork coordinates; `y` below converts from
      // top-origin screen coordinates to pdf-lib's bottom-origin system.
      const yInStamp = isDepartment ? 195 : (layout?.date.y ?? 91);
      const fontSize = Math.max(5, 15.9867 * scale);
      const x = pageWidth * stampBox.xPct + xInStamp * scale;
      const y = pageHeight * (1 - stampBox.yPct) - yInStamp * scale - fontSize;
      const text = isDepartment ? field.text.replace(/^Copy to:\s*/, "") : field.text.replace(/^Date:\s*/, "");

      // The artwork's blue/red "Date" caption must be covered before the
      // actual date is drawn into the field.
      if (!isDepartment && layout) {
        const dateBox = layout.date;
        const dateX = pageWidth * stampBox.xPct + dateBox.x * scale;
        const dateY = pageHeight * (1 - stampBox.yPct) - (dateBox.y + dateBox.height) * scale;
        page.drawRectangle({
          x: dateX,
          y: dateY,
          width: dateBox.width * scale,
          height: dateBox.height * scale,
          color: rgb(1, 1, 1),
        });
      }

      page.drawText(text, { x, y, size: fontSize, font, color: stampColor });
    }
  }

  const out = await pdfDoc.save();
  return Buffer.from(out);
}
