export type DrawingExtract = {
  page_count: number;
  source_file: string;
  part_number: string | null;
  revision: string | null;
  part_name: string | null;
  customer_name: string | null;
  material: string | null;
  thickness_in: number | null;
  unit_weight_lb: number | null;
  finish: string | null;
  holes: number | null;
  slots: number | null;
  bends: number | null;
  hem_count: number | null;
  blank_length_in: number | null;
  overall_length_in: number | null;
  overall_width_in: number | null;
  missing: string[];
};

export type GeometryEstimate = {
  blank_length_in: number | null | undefined;
  blank_width_in: number | null | undefined;
  net_area_in2: number | null;
  scrap_weight_lb: number | null;
  cut_length_in: number | null;
  cut_length_basis: string;
};

function num(re: RegExp, text: string) {
  const match = text.match(re);
  return match ? Number(match[1]) : null;
}

export function engineeringEstimateFromExtract(extracted: DrawingExtract): GeometryEstimate {
  const thickness = extracted.thickness_in ?? 0.12;
  const blankL = extracted.blank_length_in ?? extracted.overall_length_in;
  const blankW = extracted.overall_width_in ?? 7;
  const blankArea = blankL && blankW ? blankL * blankW : null;
  const unitWeight = extracted.unit_weight_lb;
  const netArea =
    unitWeight != null
      ? unitWeight / (thickness * 0.2836)
      : blankArea != null
        ? blankArea * 0.68
        : null;
  const scrapArea =
    blankArea != null && netArea != null ? Math.max(0, blankArea - netArea) : null;
  const scrapWeight = scrapArea != null ? scrapArea * thickness * 0.2836 : null;
  const holes = extracted.holes ?? 0;
  const slots = extracted.slots ?? 0;
  const holeLen = holes * Math.PI * 0.547;
  const slotLen = slots * 3.2;
  const profile = blankL && blankW ? 2 * (blankL + blankW) + 20 : null;
  const cutLength = profile != null ? profile + holeLen + slotLen : null;

  return {
    blank_length_in: blankL,
    blank_width_in: blankW,
    net_area_in2: netArea,
    scrap_weight_lb: scrapWeight,
    cut_length_in: cutLength,
    cut_length_basis: "Estimación geométrica ±30 %. Confirma con DXF si está disponible.",
  };
}

export async function extractDrawingFromPdf(
  bytes: Buffer,
  originalName = "",
): Promise<DrawingExtract> {
  // pdf-parse 1.x loads a demo file if required from the package root.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{
    text: string;
    numpages: number;
  }>;
  const parsed = await pdfParse(bytes);
  const text = parsed.text.replace(/\u0000/g, " ").replace(/[ \t]+/g, " ");
  const upper = text.toUpperCase();
  const fileBase = originalName.replace(/\.pdf$/i, "");
  const partFromFile = fileBase.match(/(\d{5,})/);
  const revFromFile = fileBase.match(/REV[_\s-]?([A-Z0-9]+)/i);

  const extracted: DrawingExtract = {
    page_count: parsed.numpages,
    source_file: originalName,
    part_number: partFromFile ? partFromFile[1] : null,
    revision: revFromFile ? revFromFile[1].toUpperCase() : null,
    part_name: null,
    customer_name: null,
    material: null,
    thickness_in: null,
    unit_weight_lb: null,
    finish: null,
    holes: null,
    slots: null,
    bends: null,
    hem_count: null,
    blank_length_in: null,
    overall_length_in: null,
    overall_width_in: null,
    missing: [],
  };

  const title = text.match(/TITLE[\s\S]{0,80}?([A-Z][A-Z ,/-]{8,80})/);
  if (title) extracted.part_name = title[1].replace(/\s+/g, " ").trim();
  const partLabel = text.match(/(?:PART(?: NUMBER)?|N[°º]?\s*PARTE|P\/N)\s*[:#]?\s*([A-Z0-9._-]{3,40})/i);
  if (!extracted.part_number && partLabel) extracted.part_number = partLabel[1];

  const thk =
    text.match(/\.(\d{3})\s*±\s*\.(\d{3})\s*MAT'?L/i) ||
    text.match(/(\.\d{3})\s*(?:THK|THICK|ESPESOR)/i);
  if (thk) {
    const raw = thk[1];
    extracted.thickness_in = Number(raw) < 1 ? Number(raw) : Number(`0.${raw}`);
  }

  extracted.unit_weight_lb = num(/UNIT WEIGHT[^\d]{0,20}(\d+(?:\.\d+)?)/i, text);
  extracted.overall_length_in =
    num(/OVERALL LENGTH[^\d]{0,12}(\d+(?:\.\d+)?)/i, text) ??
    num(/FORMED[^\d]{0,12}(\d+(?:\.\d+)?)/i, text);
  extracted.blank_length_in = num(/FLAT[^\d]{0,12}(\d+(?:\.\d+)?)/i, text);
  extracted.overall_width_in = num(/(?:OVERALL )?WIDTH[^\d]{0,12}(\d+(?:\.\d+)?)/i, text);

  const holes = text.match(/(\d+)\s*[Xx]\s*\.?\d{2,3}/);
  if (holes) extracted.holes = Number(holes[1]);
  if (/90\s*°?\s*TYP.*BEND/i.test(upper) || /ALL BENDS/i.test(upper)) {
    extracted.bends = 4;
  } else {
    const bendCount = num(/(\d+)\s*(?:BENDS?|DOBLECES)/i, text);
    if (bendCount) extracted.bends = bendCount;
  }
  if (/HEMMED FLANGE/i.test(upper)) {
    extracted.hem_count = Math.max(1, (upper.match(/HEMMED FLANGE/g) || []).length);
  } else if (/HEMMED/i.test(upper)) {
    extracted.hem_count = 2;
  }

  if (/POWDER COAT|ELECTROST|PINTURA EN POLVO/i.test(upper)) {
    extracted.finish = "POWDER COAT";
  }

  const grades = ["5052", "316", "304", "1018", "A36", "6061"];
  for (const grade of grades) {
    if (new RegExp(`(?:^|[^A-Z0-9])${grade}(?:[^A-Z0-9]|$)`).test(upper)) {
      extracted.material = grade;
      break;
    }
  }
  const matLine = text.match(/MATERIAL:\s*([^\n]+)/i);
  if (matLine) extracted.material = matLine[1].replace(/\s+/g, " ").trim();

  const labeled = text.match(
    /(?:CUSTOMER|CLIENT|COMPANY|EMPRESA|SOLD TO)\s*[:\-]\s*([^\n]{3,80})/i,
  );
  if (labeled) extracted.customer_name = labeled[1].replace(/\s+/g, " ").trim();

  if (!extracted.part_number) extracted.missing.push("número de parte");
  if (!extracted.unit_weight_lb) extracted.missing.push("peso unitario");
  if (!extracted.thickness_in) extracted.missing.push("espesor");

  return extracted;
}
