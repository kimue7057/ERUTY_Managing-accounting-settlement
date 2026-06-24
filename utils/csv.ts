export type CsvPrimitive = string | number | boolean | null | undefined;

export type CsvColumn<T> = {
  key: keyof T | string;
  header: string;
  accessor?: (row: T) => CsvPrimitive;
};

function escapeCsvValue(value: CsvPrimitive) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalizedValue =
    typeof value === "boolean" ? (value ? "true" : "false") : String(value);

  return `"${normalizedValue.replace(/"/g, "\"\"")}"`;
}

export function createCsvContent<T>(rows: T[], columns: CsvColumn<T>[]) {
  const headerRow = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const dataRows = rows.map((row) =>
    columns
      .map((column) => {
        const rawValue =
          typeof column.accessor === "function"
            ? column.accessor(row)
            : (row[column.key as keyof T] as CsvPrimitive);

        return escapeCsvValue(rawValue);
      })
      .join(","),
  );

  return `\uFEFF${[headerRow, ...dataRows].join("\r\n")}`;
}

export function downloadCsvFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = blobUrl;
  anchor.download = fileName;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 0);
}
