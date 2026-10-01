import ExcelJS from "exceljs";

export const COLOR_RED = "FFB00020";
export const COLOR_BLACK = "FF0F0F0F";
export const COLOR_GRAY_LIGHT = "FFF7F7F7";
export const COLOR_GRAY_MED = "FFE5E5E5";
export const COLOR_WHITE = "FFFFFFFF";
export const COLOR_BORDER = "FFBFBFBF";
export const COLOR_YELLOW = "FFFFF3CD";

export const thinBorder = {
  top: { style: "thin" as const, color: { argb: COLOR_BORDER } },
  left: { style: "thin" as const, color: { argb: COLOR_BORDER } },
  bottom: { style: "thin" as const, color: { argb: COLOR_BORDER } },
  right: { style: "thin" as const, color: { argb: COLOR_BORDER } },
};

export const applyHeaderStyle = (row: ExcelJS.Row) => {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_BLACK } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  });
};

export const applyTotalStyle = (row: ExcelJS.Row) => {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_RED } };
    cell.alignment = { vertical: "middle" };
    cell.border = thinBorder;
  });
};

export const applyTitleStyle = (row: ExcelJS.Row) => {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 13 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_RED } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
};

export const applyZebra = (row: ExcelJS.Row, idx: number) => {
  const fill = idx % 2 === 0 ? COLOR_GRAY_LIGHT : COLOR_WHITE;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.border = thinBorder;
    cell.alignment = { vertical: "middle" };
  });
};
