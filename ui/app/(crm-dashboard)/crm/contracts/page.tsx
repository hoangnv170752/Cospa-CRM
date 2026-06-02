/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ChevronLeft, ChevronRight, Search, Plus, FileText, Calendar, DollarSign, FileUp } from "lucide-react";
import { ExcelImportDialog, ExcelImportConfig } from "@/components/excel-import-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fetchContracts, createContract, updateContract, deleteContract, Contract, fetchVendors, Vendor, fetchCompanies, Company } from "@/lib/crm";

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-600",
  pending_approval: "bg-amber-500/10 text-amber-600",
  active: "bg-green-500/10 text-green-600",
  expired: "bg-red-500/10 text-red-600",
  cancelled: "bg-gray-500/10 text-gray-600",
};

export default function ContractsPage() {
  const t = useTranslations();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Form state
  const [formContractNumber, setFormContractNumber] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<string>("service");
  const [formVendorId, setFormVendorId] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formAutoRenew, setFormAutoRenew] = useState(false);
  const [formTotalValue, setFormTotalValue] = useState("");
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formStatus, setFormStatus] = useState<string>("draft");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRelated = useCallback(async () => {
    try {
      const [vendorsRes, companiesRes] = await Promise.all([
        fetchVendors({ limit: 100 }),
        fetchCompanies({ limit: 100 }),
      ]);
      setVendors(vendorsRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      console.error("Failed to load related data:", error);
    }
  }, []);

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchContracts({
        page: currentPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      });
      setContracts(response.data);
      setTotalPages(response.totalPages);
      setTotalElements(response.total);
    } catch (error) {
      console.error("Failed to load contracts:", error);
      toast.error("Failed to load contracts");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedStatus]);

  useEffect(() => {
    loadRelated();
  }, [loadRelated]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const resetForm = () => {
    setFormContractNumber("");
    setFormTitle("");
    setFormDescription("");
    setFormType("service");
    setFormVendorId("");
    setFormCompanyId("");
    setFormStartDate("");
    setFormEndDate("");
    setFormAutoRenew(false);
    setFormTotalValue("");
    setFormCurrency("USD");
    setFormStatus("draft");
    setEditingContract(null);
  };

  const handleOpenDialog = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setFormContractNumber(contract.contractNumber);
      setFormTitle(contract.title);
      setFormDescription(contract.description || "");
      setFormType(contract.type);
      setFormVendorId(contract.vendorId || "");
      setFormCompanyId(contract.companyId || "");
      setFormStartDate(contract.startDate.split("T")[0]);
      setFormEndDate(contract.endDate?.split("T")[0] || "");
      setFormAutoRenew(contract.autoRenew);
      setFormTotalValue(contract.totalValue?.toString() || "");
      setFormCurrency(contract.currency);
      setFormStatus(contract.status);
    } else {
      resetForm();
      // Auto-generate contract number
      setFormContractNumber(`CTR-${Date.now().toString(36).toUpperCase()}`);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formContractNumber.trim()) {
      toast.error("Contract number is required");
      return;
    }
    if (!formTitle.trim()) {
      toast.error("Contract title is required");
      return;
    }
    if (!formStartDate) {
      toast.error("Start date is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        contractNumber: formContractNumber.trim(),
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        type: formType as Contract["type"],
        vendorId: formVendorId || undefined,
        companyId: formCompanyId || undefined,
        startDate: formStartDate,
        endDate: formEndDate || undefined,
        autoRenew: formAutoRenew,
        totalValue: formTotalValue ? Number(formTotalValue) : undefined,
        currency: formCurrency,
        status: formStatus as Contract["status"],
      };

      if (editingContract) {
        await updateContract(editingContract.id, data);
        toast.success("Contract updated");
      } else {
        await createContract(data);
        toast.success("Contract created");
      }
      handleCloseDialog();
      loadContracts();
    } catch (error) {
      console.error("Failed to save contract:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save contract");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (contract: Contract) => {
    if (!confirm(`Delete contract "${contract.title}"?`)) return;

    try {
      await deleteContract(contract.id);
      toast.success("Contract deleted");
      loadContracts();
    } catch (error) {
      console.error("Failed to delete contract:", error);
      toast.error("Failed to delete contract");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (value?: number, currency?: string) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const importConfig: ExcelImportConfig<Partial<Contract>> = {
    title: "Import Contracts",
    description: "Upload an Excel file to bulk import contracts into the system.",
    columns: [
      { excelColumn: "Contract Number", fieldName: "contractNumber", required: true },
      { excelColumn: "Title", fieldName: "title", required: true },
      { excelColumn: "Description", fieldName: "description" },
      {
        excelColumn: "Type",
        fieldName: "type",
        transform: (v) => {
          const val = String(v).toLowerCase().replace(/\s+/g, "_");
          if (["purchase", "sales", "service", "maintenance", "subscription", "nda", "partnership"].includes(val)) return val;
          return "service";
        },
      },
      { excelColumn: "Start Date", fieldName: "startDate", required: true },
      { excelColumn: "End Date", fieldName: "endDate" },
      {
        excelColumn: "Auto Renew",
        fieldName: "autoRenew",
        transform: (v) => {
          const val = String(v).toLowerCase();
          return val === "true" || val === "yes" || val === "1";
        },
      },
      {
        excelColumn: "Total Value",
        fieldName: "totalValue",
        transform: (v) => {
          const num = parseFloat(String(v));
          return isNaN(num) ? undefined : num;
        },
      },
      { excelColumn: "Currency", fieldName: "currency" },
      {
        excelColumn: "Status",
        fieldName: "status",
        transform: (v) => {
          const val = String(v).toLowerCase().replace(/\s+/g, "_");
          if (["draft", "pending_approval", "active", "expired", "cancelled"].includes(val)) return val;
          return "draft";
        },
      },
    ],
    sampleData: [
      { "Contract Number": "CTR-001", Title: "Annual Service Agreement", Description: "Annual maintenance contract", Type: "service", "Start Date": "2025-01-01", "End Date": "2025-12-31", "Auto Renew": "yes", "Total Value": 50000, Currency: "USD", Status: "active" },
      { "Contract Number": "CTR-002", Title: "Software License", Description: "Enterprise license agreement", Type: "subscription", "Start Date": "2025-02-01", "End Date": "2026-01-31", "Auto Renew": "no", "Total Value": 25000, Currency: "USD", Status: "draft" },
    ],
    validateRow: (row) => {
      if (!row.contractNumber || String(row.contractNumber).trim() === "") {
        return { valid: false, error: "Contract Number is required" };
      }
      if (!row.title || String(row.title).trim() === "") {
        return { valid: false, error: "Title is required" };
      }
      if (!row.startDate) {
        return { valid: false, error: "Start Date is required" };
      }
      return { valid: true };
    },
    onImport: async (items) => {
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const item of items) {
        try {
          await createContract({
            contractNumber: String(item.contractNumber).trim(),
            title: String(item.title).trim(),
            description: item.description ? String(item.description).trim() : undefined,
            type: (item.type as Contract["type"]) || "service",
            startDate: String(item.startDate),
            endDate: item.endDate ? String(item.endDate) : undefined,
            autoRenew: Boolean(item.autoRenew),
            totalValue: item.totalValue as number | undefined,
            currency: item.currency ? String(item.currency).trim() : "USD",
            status: (item.status as Contract["status"]) || "draft",
          });
          success++;
        } catch (err) {
          failed++;
          errors.push(`Failed to import "${item.title}": ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (success > 0) {
        loadContracts();
      }

      return { success, failed, errors: errors.length > 0 ? errors : undefined };
    },
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
              {t("crm.contracts.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("crm.contracts.description")} ({totalElements} total)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm">
              <FileUp className="h-4 w-4" />
              Import Excel
            </Button>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="h-4 w-4" />
              {t("crm.contracts.addContract")}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("common.searchByName")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedStatus} onValueChange={(v) => { if (v) { setSelectedStatus(v); setCurrentPage(1); } }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <span>{selectedStatus === "all" ? "All Statuses" : t(`crm.contracts.statuses.${selectedStatus}`)}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">{t("crm.contracts.statuses.draft")}</SelectItem>
              <SelectItem value="pending_approval">{t("crm.contracts.statuses.pending_approval")}</SelectItem>
              <SelectItem value="active">{t("crm.contracts.statuses.active")}</SelectItem>
              <SelectItem value="expired">{t("crm.contracts.statuses.expired")}</SelectItem>
              <SelectItem value="cancelled">{t("crm.contracts.statuses.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>{t("crm.contracts.noContracts")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("crm.contracts.contractTitle")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("crm.contracts.type")}</TableHead>
                  <TableHead>{t("crm.contracts.status")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("crm.contracts.value")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("crm.contracts.endDate")}</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{contract.title}</p>
                        <p className="text-xs text-muted-foreground">{contract.contractNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{t(`crm.contracts.types.${contract.type}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[contract.status] || ""}>
                        {t(`crm.contracts.statuses.${contract.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatCurrency(contract.totalValue, contract.currency)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatDate(contract.endDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(contract)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(contract)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("common.page")} {currentPage} {t("common.of")} {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("common.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages || isLoading}
              >
                {t("common.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingContract ? t("crm.contracts.editContract") : t("crm.contracts.addContract")}
              </DialogTitle>
              <DialogDescription>
                {editingContract ? "Update contract information" : "Create a new contract"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contract-number">
                    {t("crm.contracts.contractNumber")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contract-number"
                    value={formContractNumber}
                    onChange={(e) => setFormContractNumber(e.target.value)}
                    placeholder="CTR-001"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t("crm.contracts.type")}</Label>
                  <Select value={formType} onValueChange={(v) => v !== null && setFormType(v)}>
                    <SelectTrigger>
                      <span>{t(`crm.contracts.types.${formType}`)}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">{t("crm.contracts.types.purchase")}</SelectItem>
                      <SelectItem value="sales">{t("crm.contracts.types.sales")}</SelectItem>
                      <SelectItem value="service">{t("crm.contracts.types.service")}</SelectItem>
                      <SelectItem value="maintenance">{t("crm.contracts.types.maintenance")}</SelectItem>
                      <SelectItem value="subscription">{t("crm.contracts.types.subscription")}</SelectItem>
                      <SelectItem value="nda">{t("crm.contracts.types.nda")}</SelectItem>
                      <SelectItem value="partnership">{t("crm.contracts.types.partnership")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contract-title">
                  {t("crm.contracts.contractTitle")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contract-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Annual Service Agreement"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contract-description">Description</Label>
                <Textarea
                  id="contract-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Contract details..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>{t("crm.contracts.vendor")}</Label>
                  <Select value={formVendorId} onValueChange={(v) => v !== null && setFormVendorId(v)}>
                    <SelectTrigger>
                      <span>
                        {formVendorId
                          ? vendors.find((v) => v.id === formVendorId)?.name || "Select vendor"
                          : "Select vendor"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t("crm.contracts.company")}</Label>
                  <Select value={formCompanyId} onValueChange={(v) => v !== null && setFormCompanyId(v)}>
                    <SelectTrigger>
                      <span>
                        {formCompanyId
                          ? companies.find((c) => c.id === formCompanyId)?.name || "Select company"
                          : "Select company"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contract-start">
                    {t("crm.contracts.startDate")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contract-start"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contract-end">{t("crm.contracts.endDate")}</Label>
                  <Input
                    id="contract-end"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contract-value">{t("crm.contracts.value")}</Label>
                  <Input
                    id="contract-value"
                    type="number"
                    value={formTotalValue}
                    onChange={(e) => setFormTotalValue(e.target.value)}
                    placeholder="10000"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Currency</Label>
                  <Select value={formCurrency} onValueChange={(v) => v !== null && setFormCurrency(v)}>
                    <SelectTrigger>
                      <span>{formCurrency}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="VND">VND</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t("crm.contracts.status")}</Label>
                <Select value={formStatus} onValueChange={(v) => v !== null && setFormStatus(v)}>
                  <SelectTrigger>
                    <span>{t(`crm.contracts.statuses.${formStatus}`)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t("crm.contracts.statuses.draft")}</SelectItem>
                    <SelectItem value="pending_approval">{t("crm.contracts.statuses.pending_approval")}</SelectItem>
                    <SelectItem value="active">{t("crm.contracts.statuses.active")}</SelectItem>
                    <SelectItem value="expired">{t("crm.contracts.statuses.expired")}</SelectItem>
                    <SelectItem value="cancelled">{t("crm.contracts.statuses.cancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formAutoRenew}
                  onChange={(e) => setFormAutoRenew(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Auto-renew
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Excel Import Dialog */}
        <ExcelImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          config={importConfig}
        />
      </div>
    </div>
  );
}
