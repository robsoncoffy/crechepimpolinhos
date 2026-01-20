import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Column {
  key: string;
  label: string;
}

interface ExportButtonsProps {
  data: any[];
  filename: string;
  columns?: Column[];
  printElementId?: string;
  size?: "sm" | "default";
}

/**
 * Export data to CSV file
 */
export function exportToCSV(
  data: any[],
  filename: string,
  columns?: Column[]
): void {
  if (data.length === 0) {
    toast.error("Nenhum dado para exportar");
    return;
  }

  let headers: string;
  let rows: string;

  if (columns && columns.length > 0) {
    // Use specified columns
    headers = columns.map((col) => col.label).join(",");
    rows = data
      .map((row) =>
        columns
          .map((col) => {
            const val = row[col.key];
            return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val ?? "";
          })
          .join(",")
      )
      .join("\n");
  } else {
    // Use all keys from first row
    headers = Object.keys(data[0]).join(",");
    rows = data
      .map((row) =>
        Object.values(row)
          .map((val) =>
            typeof val === "string" ? `"${String(val).replace(/"/g, '""')}"` : val ?? ""
          )
          .join(",")
      )
      .join("\n");
  }

  const csv = `\uFEFF${headers}\n${rows}`; // BOM for UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success("Relatório exportado com sucesso!");
}

/**
 * Print the page or specific element
 */
export function handlePrint(elementId?: string): void {
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Impressão</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  } else {
    window.print();
  }
}

/**
 * Reusable export buttons component
 */
export function ExportButtons({
  data,
  filename,
  columns,
  printElementId,
  size = "sm",
}: ExportButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size={size}
        onClick={() => exportToCSV(data, filename, columns)}
      >
        <Download className="w-4 h-4 mr-2" />
        CSV
      </Button>
      <Button
        variant="outline"
        size={size}
        onClick={() => handlePrint(printElementId)}
      >
        <FileText className="w-4 h-4 mr-2" />
        Imprimir
      </Button>
    </div>
  );
}

export default ExportButtons;
