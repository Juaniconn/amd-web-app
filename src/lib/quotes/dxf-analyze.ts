type DxfEntity = {
  type?: string;
  start?: { x?: number; y?: number };
  end?: { x?: number; y?: number };
  center?: { x?: number; y?: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  vertices?: { x?: number; y?: number }[];
  shape?: boolean;
  closed?: boolean;
};

export type DxfAnalysis = {
  ok: boolean;
  error?: string;
  entity_count?: number;
  cut_length_in?: number | null;
  holes?: number;
  closed_polylines?: number;
  blank_width_in?: number | null;
  blank_length_in?: number | null;
  note?: string;
};

function dist(
  a: { x?: number; y?: number } | undefined,
  b: { x?: number; y?: number } | undefined,
) {
  return Math.hypot((b?.x ?? 0) - (a?.x ?? 0), (b?.y ?? 0) - (a?.y ?? 0));
}

export function analyzeDxfText(text: string): DxfAnalysis {
  let DxfParser: new () => { parseSync: (src: string) => { entities?: DxfEntity[] } };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require("dxf-parser") as
      | (new () => { parseSync: (src: string) => { entities?: DxfEntity[] } })
      | { default: new () => { parseSync: (src: string) => { entities?: DxfEntity[] } } };
    DxfParser = typeof loaded === "function" ? loaded : loaded.default;
  } catch {
    return { ok: false, error: "El analizador DXF no está instalado." };
  }

  let dxf: { entities?: DxfEntity[] };
  try {
    dxf = new DxfParser().parseSync(text);
  } catch (error) {
    return {
      ok: false,
      error: `DXF no parseable: ${error instanceof Error ? error.message : "error"}`,
    };
  }

  const entities = dxf.entities || [];
  let cutLength = 0;
  let holes = 0;
  let slots = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const bumpBox = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const entity of entities) {
    const type = (entity.type || "").toUpperCase();
    if (type === "LINE" && entity.start && entity.end) {
      cutLength += dist(entity.start, entity.end);
      bumpBox(entity.start.x ?? 0, entity.start.y ?? 0);
      bumpBox(entity.end.x ?? 0, entity.end.y ?? 0);
    } else if (type === "CIRCLE") {
      const r = entity.radius || 0;
      cutLength += 2 * Math.PI * r;
      holes += 1;
      bumpBox((entity.center?.x || 0) - r, (entity.center?.y || 0) - r);
      bumpBox((entity.center?.x || 0) + r, (entity.center?.y || 0) + r);
    } else if (type === "ARC") {
      const r = entity.radius || 0;
      const start = ((entity.startAngle ?? 0) * Math.PI) / 180;
      const end = ((entity.endAngle ?? 0) * Math.PI) / 180;
      let sweep = end - start;
      if (sweep < 0) sweep += 2 * Math.PI;
      cutLength += r * sweep;
    } else if (type === "LWPOLYLINE" || type === "POLYLINE") {
      const verts = entity.vertices || [];
      for (let i = 0; i < verts.length - 1; i += 1) {
        cutLength += dist(verts[i], verts[i + 1]);
        bumpBox(verts[i].x ?? 0, verts[i].y ?? 0);
      }
      if (entity.shape || entity.closed) {
        cutLength += dist(verts[verts.length - 1], verts[0]);
        slots += 1;
      }
      verts.forEach((v) => bumpBox(v.x ?? 0, v.y ?? 0));
    }
  }

  const width = Number.isFinite(minX) ? maxX - minX : null;
  const height = Number.isFinite(minY) ? maxY - minY : null;

  return {
    ok: true,
    entity_count: entities.length,
    cut_length_in: cutLength || null,
    holes,
    closed_polylines: slots,
    blank_width_in: width,
    blank_length_in: height != null && width != null ? Math.max(width, height) : height,
    note: "Longitud de corte desde DXF. Se asumen pulgadas si el plano está en pulgadas.",
  };
}

export function analyzeDxfBytes(bytes: Buffer) {
  return analyzeDxfText(bytes.toString("utf8"));
}
