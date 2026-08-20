export function piecesFromSheet(input: {
  blankWidthIn?: number | null;
  blankLengthIn?: number | null;
  sheetWidthIn?: number | null;
  sheetLengthIn?: number | null;
}) {
  const blankW = Number(input.blankWidthIn || 0);
  const blankL = Number(input.blankLengthIn || 0);
  const sheetW = Number(input.sheetWidthIn || 0);
  const sheetL = Number(input.sheetLengthIn || 0);
  if (blankW <= 0 || blankL <= 0 || sheetW <= 0 || sheetL <= 0) return null;
  const across = Math.floor(sheetW / blankW) * Math.floor(sheetL / blankL);
  const rotated = Math.floor(sheetW / blankL) * Math.floor(sheetL / blankW);
  const count = Math.max(across, rotated);
  return count > 0 ? count : null;
}
