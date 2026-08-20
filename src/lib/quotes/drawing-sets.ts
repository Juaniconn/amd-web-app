export type DrawingFileRef = {
  originalName: string;
};

export type DrawingSet<T extends DrawingFileRef = DrawingFileRef> = {
  stem: string;
  pdf?: T;
  cad?: T;
  files: T[];
};

export function isDrawingFileName(name: string) {
  return /\.(pdf|dxf|dwg|step|stp|iges|igs|fcstd)$/i.test(name);
}

export function isPdfFileName(name: string) {
  return name.toLowerCase().endsWith(".pdf");
}

export function isCadFileName(name: string) {
  return /\.(dxf|dwg|step|stp|iges|igs|fcstd)$/i.test(name);
}

export function drawingStem(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[\s._-]+/g, "");
}

export function drawingSetLabel(set: DrawingSet) {
  const source = set.pdf ?? set.cad ?? set.files[0];
  if (!source) return "Pieza";
  return source.originalName.replace(/\.[^.]+$/, "");
}

export function groupDrawingSets<T extends DrawingFileRef>(files: T[]): DrawingSet<T>[] {
  const drawings = files.filter((file) => isDrawingFileName(file.originalName));
  const pdfs = drawings.filter((file) => isPdfFileName(file.originalName));
  const cads = drawings.filter((file) => isCadFileName(file.originalName));
  const usedPdfs = new Set<T>();
  const usedCads = new Set<T>();
  const sets: DrawingSet<T>[] = [];

  for (const pdf of pdfs) {
    const stem = drawingStem(pdf.originalName);
    const cad = cads.find(
      (item) => !usedCads.has(item) && drawingStem(item.originalName) === stem,
    );
    if (!cad) continue;
    usedPdfs.add(pdf);
    usedCads.add(cad);
    sets.push({ stem, pdf, cad, files: [pdf, cad] });
  }

  const leftoverPdfs = pdfs.filter((file) => !usedPdfs.has(file));
  const leftoverCads = cads.filter((file) => !usedCads.has(file));

  if (leftoverPdfs.length === 1 && leftoverCads.length === 1) {
    const pdf = leftoverPdfs[0];
    const cad = leftoverCads[0];
    sets.push({
      stem: drawingStem(pdf.originalName),
      pdf,
      cad,
      files: [pdf, cad],
    });
    return sets;
  }

  for (const pdf of leftoverPdfs) {
    sets.push({
      stem: drawingStem(pdf.originalName),
      pdf,
      files: [pdf],
    });
  }
  for (const cad of leftoverCads) {
    sets.push({
      stem: drawingStem(cad.originalName),
      cad,
      files: [cad],
    });
  }
  return sets;
}
