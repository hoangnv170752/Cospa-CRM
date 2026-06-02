"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ChevronLeft, ChevronRight, Search, Plus, Building2, Globe, Phone, MapPin, FileUp } from "lucide-react";
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
import { toast } from "sonner";
import { fetchCompanies, createCompany, updateCompany, deleteCompany, Company } from "@/lib/crm";

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const t = useTranslations();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formSize, setFormSize] = useState<string>("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchCompanies({
        page: currentPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setCompanies(response.data);
      setTotalPages(response.totalPages);
      setTotalElements(response.total);
    } catch (error) {
      console.error("Failed to load companies:", error);
      toast.error("Failed to load companies");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCompanies();
  }, [loadCompanies]);

  const resetForm = () => {
    setFormName("");
    setFormIndustry("");
    setFormWebsite("");
    setFormPhone("");
    setFormAddress("");
    setFormSize("");
    setEditingCompany(null);
  };

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormName(company.name);
      setFormIndustry(company.industry || "");
      setFormWebsite(company.website || "");
      setFormPhone(company.phone || "");
      setFormAddress(company.address || "");
      setFormSize(company.size || "");
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Company name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        name: formName.trim(),
        industry: formIndustry.trim() || undefined,
        website: formWebsite.trim() || undefined,
        phone: formPhone.trim() || undefined,
        address: formAddress.trim() || undefined,
        size: formSize as Company['size'] || undefined,
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, data);
        toast.success("Company updated");
      } else {
        await createCompany(data);
        toast.success("Company created");
      }
      handleCloseDialog();
      loadCompanies();
    } catch (error) {
      console.error("Failed to save company:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save company");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (company: Company) => {
    if (!confirm(`Delete "${company.name}"?`)) return;

    try {
      await deleteCompany(company.id);
      toast.success("Company deleted");
      loadCompanies();
    } catch (error) {
      console.error("Failed to delete company:", error);
      toast.error("Failed to delete company");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getSizeLabel = (size: string | undefined) => {
    if (!size) return "-";
    return t(`crm.companies.sizes.${size}`);
  };

  const tImport = t.raw("crm.import.columns");
  const importConfig: ExcelImportConfig<Partial<Company>> = {
    entityType: "companies",
    columns: [
      { excelColumn: tImport.name, fieldName: "name", required: true },
      { excelColumn: tImport.industry, fieldName: "industry" },
      { excelColumn: tImport.website, fieldName: "website" },
      { excelColumn: tImport.phone, fieldName: "phone" },
      { excelColumn: tImport.address, fieldName: "address" },
      {
        excelColumn: tImport.size,
        fieldName: "size",
        transform: (v) => {
          const val = String(v).toLowerCase();
          if (["small", "medium", "large", "enterprise"].includes(val)) return val;
          return undefined;
        }
      },
    ],
    sampleData: [
      { [tImport.name]: "Acme Corp", [tImport.industry]: "Technology", [tImport.website]: "https://acme.com", [tImport.phone]: "+1 555-0123", [tImport.address]: "123 Main St", [tImport.size]: "medium" },
      { [tImport.name]: "Tech Solutions", [tImport.industry]: "Software", [tImport.website]: "https://techsol.com", [tImport.phone]: "+1 555-0456", [tImport.address]: "456 Oak Ave", [tImport.size]: "large" },
    ],
    validateRow: (row) => {
      if (!row.name || String(row.name).trim() === "") {
        return { valid: false, error: t("crm.import.columns.name") + " is required" };
      }
      return { valid: true };
    },
    onImport: async (items) => {
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const item of items) {
        try {
          await createCompany({
            name: String(item.name).trim(),
            industry: item.industry ? String(item.industry).trim() : undefined,
            website: item.website ? String(item.website).trim() : undefined,
            phone: item.phone ? String(item.phone).trim() : undefined,
            address: item.address ? String(item.address).trim() : undefined,
            size: item.size as Company["size"],
          });
          success++;
        } catch (err) {
          failed++;
          errors.push(`Failed to import "${item.name}": ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (success > 0) {
        loadCompanies();
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
              {t("crm.companies.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("crm.companies.description")} ({totalElements} total)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm">
              <FileUp className="h-4 w-4" />
              {t("crm.import.button")}
            </Button>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="h-4 w-4" />
              {t("crm.companies.addCompany")}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("common.searchByName")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4 opacity-50" />
              <p>{t("crm.companies.noCompanies")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("crm.companies.name")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("crm.companies.industry")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("crm.companies.size")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("crm.companies.phone")}</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{company.name}</p>
                          {company.website && (
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:underline"
                            >
                              {company.website}
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {company.industry || "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {company.size ? (
                        <Badge variant="secondary">{getSizeLabel(company.size)}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {company.phone || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatDate(company.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(company)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(company)}
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? t("crm.companies.editCompany") : t("crm.companies.addCompany")}
              </DialogTitle>
              <DialogDescription>
                {editingCompany ? "Update company information" : "Add a new company to your CRM"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company-name">
                  {t("crm.companies.name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Acme Inc."
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company-industry">{t("crm.companies.industry")}</Label>
                <Input
                  id="company-industry"
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                  placeholder="Technology"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company-website">{t("crm.companies.website")}</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="company-website"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company-phone">{t("crm.companies.phone")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="company-phone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 555-0123"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company-address">{t("crm.companies.address")}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="company-address"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="123 Main St, City"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t("crm.companies.size")}</Label>
                <Select value={formSize} onValueChange={(v) => v !== null && setFormSize(v)}>
                  <SelectTrigger>
                    <span>{formSize ? getSizeLabel(formSize) : "Select size"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">{t("crm.companies.sizes.small")}</SelectItem>
                    <SelectItem value="medium">{t("crm.companies.sizes.medium")}</SelectItem>
                    <SelectItem value="large">{t("crm.companies.sizes.large")}</SelectItem>
                    <SelectItem value="enterprise">{t("crm.companies.sizes.enterprise")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
