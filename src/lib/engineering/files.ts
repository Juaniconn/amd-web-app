export const ENGINEERING_ALLOWED_EXTENSIONS = [
  "pdf",
  "dwg",
  "dxf",
  "step",
  "stp",
  "iges",
  "igs",
  "png",
  "jpg",
  "jpeg",
  "zip",
] as const;

export type EngineeringFileExtension =
  (typeof ENGINEERING_ALLOWED_EXTENSIONS)[number];

export const ENGINEERING_MAX_FILE_BYTES = 50 * 1024 * 1024;

export const ENGINEERING_FILE_MIME: Record<EngineeringFileExtension, string> = {
  pdf: "application/pdf",
  dwg: "application/acad",
  dxf: "image/vnd.dxf",
  step: "application/step",
  stp: "application/step",
  iges: "model/iges",
  igs: "model/iges",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  zip: "application/zip",
};

export const ENGINEERING_FILE_LABELS = [
  "PDF",
  "DWG",
  "DXF",
  "STEP",
  "STP",
  "IGES",
  "PNG",
  "JPG",
  "ZIP",
] as const;
