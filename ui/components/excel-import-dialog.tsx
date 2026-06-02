"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react";
import * as XLSX from "xlsx";

export interface ColumnMapping {
  excelColumn: string;
  fieldName: string;
  required?: boolean;
  transform?: (value: unknown) => unknown;
}

export interface ExcelImportConfig<T> {
  title: string;
  description: string;
  columns: ColumnMapping[];
  validateRow?: (row: T) => { valid: boolean; error?: string };
  onImport: (items: T[]) => Promise<{ success: number; failed: number; errors?: string[] }>;
  sampleData?: Record<string, unknown>[];
}

interface ExcelImportDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ExcelImportConfig<T>;
}

type ImportStatus = "idle" | "parsing" | "preview" | "importing" | "complete";

interface ParsedRow<T> {
  data: T;
  valid: boolean;
  error?: string;
  rowNumber: number;
}

export function ExcelImportDialog<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  config,
}: ExcelImportDialogProps<T>) {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [parsedRows, setParsedRows] = useState<ParsedRow<T>[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors?: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStatus("idle");
    setParsedRows([]);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("parsing");
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      if (jsonData.length < 2) {
        setError("File must have at least a header row and one data row");
        setStatus("idle");
        return;
      }

      const headers = jsonData[0] as string[];
      const rows: ParsedRow<T>[] = [];

      // Map column indices
      const columnIndices: Record<string, number> = {};
      config.columns.forEach((col) => {
        const index = headers.findIndex(
          (h) => h?.toString().toLowerCase().trim() === col.excelColumn.toLowerCase().trim()
        );
        if (index !== -1) {
          columnIndices[col.fieldName] = index;
        }
      });

      // Check required columns
      const missingRequired = config.columns
        .filter((col) => col.required && columnIndices[col.fieldName] === undefined)
        .map((col) => col.excelColumn);

      if (missingRequired.length > 0) {
        setError(`Missing required columns: ${missingRequired.join(", ")}`);
        setStatus("idle");
        return;
      }

      // Parse rows
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (!row || row.length === 0 || row.every((cell) => cell === null || cell === undefined || cell === "")) {
          continue; // Skip empty rows
        }

        const rowData: Record<string, unknown> = {};

        config.columns.forEach((col) => {
          const index = columnIndices[col.fieldName];
          if (index !== undefined) {
            let value = row[index];
            if (col.transform) {
              value = col.transform(value);
            }
            rowData[col.fieldName] = value;
          }
        });

        let valid = true;
        let errorMsg: string | undefined;

        // Check required fields
        for (const col of config.columns) {
          if (col.required) {
            const value = rowData[col.fieldName];
            if (value === null || value === undefined || value === "") {
              valid = false;
              errorMsg = `Missing required field: ${col.excelColumn}`;
              break;
            }
          }
        }

        // Custom validation
        if (valid && config.validateRow) {
          const validation = config.validateRow(rowData as T);
          valid = validation.valid;
          errorMsg = validation.error;
        }

        rows.push({
          data: rowData as T,
          valid,
          error: errorMsg,
          rowNumber: i + 1,
        });
      }

      if (rows.length === 0) {
        setError("No valid data rows found in the file");
        setStatus("idle");
        return;
      }

      setParsedRows(rows);
      setStatus("preview");
    } catch (err) {
      console.error("Failed to parse Excel file:", err);
      setError("Failed to parse Excel file. Please check the file format.");
      setStatus("idle");
    }
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((row) => row.valid);
    if (validRows.length === 0) {
      setError("No valid rows to import");
      return;
    }

    setStatus("importing");
    setError(null);

    try {
      const result = await config.onImport(validRows.map((row) => row.data));
      setImportResult(result);
      setStatus("complete");
    } catch (err) {
      console.error("Import failed:", err);
      setError(err instanceof Error ? err.message : "Import failed");
      setStatus("preview");
    }
  };

  const downloadSampleFile = () => {
    const sampleData = config.sampleData || [
      config.columns.reduce((acc, col) => {
        acc[col.excelColumn] = col.required ? `Sample ${col.excelColumn}` : "";
        return acc;
      }, {} as Record<string, string>),
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${config.title.toLowerCase().replace(/\s+/g, "-")}-template.xlsx`);
  };

  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {status === "idle" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center w-full">
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload an Excel file (.xlsx, .xls) or CSV file
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Expected columns:</span>
                {config.columns.map((col) => (
                  <Badge key={col.fieldName} variant={col.required ? "default" : "secondary"}>
                    {col.excelColumn}
                    {col.required && " *"}
                  </Badge>
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={downloadSampleFile}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {status === "parsing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Parsing file...</p>
            </div>
          )}

          {status === "preview" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Row</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                      {config.columns.slice(0, 5).map((col) => (
                        <TableHead key={col.fieldName}>{col.excelColumn}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.slice(0, 100).map((row, index) => (
                      <TableRow key={index} className={!row.valid ? "bg-destructive/10" : ""}>
                        <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-xs text-destructive">{row.error}</span>
                          )}
                        </TableCell>
                        {config.columns.slice(0, 5).map((col) => (
                          <TableCell key={col.fieldName} className="max-w-[150px] truncate">
                            {String(row.data[col.fieldName] ?? "-")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {parsedRows.length > 100 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing first 100 rows of {parsedRows.length} total
                </p>
              )}

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {status === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Importing {validCount} items...
              </p>
            </div>
          )}

          {status === "complete" && importResult && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div className="text-center">
                <p className="font-medium text-lg">Import Complete</p>
                <p className="text-sm text-muted-foreground">
                  Successfully imported {importResult.success} items
                  {importResult.failed > 0 && `, ${importResult.failed} failed`}
                </p>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <ScrollArea className="h-[150px] w-full border rounded-lg p-3">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">
                      {err}
                    </p>
                  ))}
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {status === "idle" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {status === "preview" && (
            <>
              <Button variant="outline" onClick={resetState}>
                Select Another File
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Import {validCount} Items
              </Button>
            </>
          )}

          {status === "complete" && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
