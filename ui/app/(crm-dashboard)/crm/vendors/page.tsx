"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ChevronLeft, ChevronRight, Search, Plus, Truck, Globe, Mail, Phone, Star, FileUp } from "lucide-react";
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
import { fetchVendors, createVendor, updateVendor, deleteVendor, Vendor } from "@/lib/crm";

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  active: "bg-green-500/10 text-green-600",
  inactive: "bg-slate-500/10 text-slate-600",
  blacklisted: "bg-red-500/10 text-red-600",
};

export default function VendorsPage() {
  const t = useTranslations();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<string>("supplier");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formStatus, setFormStatus] = useState<string>("pending");
  const [formNotes, setFormNotes] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchVendors({
        page: currentPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      });
      setVendors(response.data);
      setTotalPages(response.totalPages);
      setTotalElements(response.total);
    } catch (error) {
      console.error("Failed to load vendors:", error);
      toast.error("Failed to load vendors");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVendors();
  }, [loadVendors]);

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormType("supplier");
    setFormEmail("");
    setFormPhone("");
    setFormWebsite("");
    setFormAddress("");
    setFormCity("");
    setFormCountry("");
    setFormCurrency("USD");
    setFormStatus("pending");
    setFormNotes("");
    setEditingVendor(null);
  };

  const handleOpenDialog = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormName(vendor.name);
      setFormCode(vendor.code);
      setFormType(vendor.type);
      setFormEmail(vendor.email || "");
      setFormPhone(vendor.phone || "");
      setFormWebsite(vendor.website || "");
      setFormAddress(vendor.address || "");
      setFormCity(vendor.city || "");
      setFormCountry(vendor.country || "");
      setFormCurrency(vendor.currency);
      setFormStatus(vendor.status);
      setFormNotes(vendor.notes || "");
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
      toast.error("Vendor name is required");
      return;
    }
    if (!formCode.trim()) {
      toast.error("Vendor code is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        name: formName.trim(),
        code: formCode.trim(),
        type: formType as Vendor["type"],
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        website: formWebsite.trim() || undefined,
        address: formAddress.trim() || undefined,
        city: formCity.trim() || undefined,
        country: formCountry.trim() || undefined,
        currency: formCurrency,
        status: formStatus as Vendor["status"],
        notes: formNotes.trim() || undefined,
      };

      if (editingVendor) {
        await updateVendor(editingVendor.id, data);
        toast.success("Vendor updated");
      } else {
        await createVendor(data);
        toast.success("Vendor created");
      }
      handleCloseDialog();
      loadVendors();
    } catch (error) {
      console.error("Failed to save vendor:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save vendor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    if (!confirm(`Delete "${vendor.name}"?`)) return;

    try {
      await deleteVendor(vendor.id);
      toast.success("Vendor deleted");
      loadVendors();
    } catch (error) {
      console.error("Failed to delete vendor:", error);
      toast.error("Failed to delete vendor");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderRating = (rating?: number) => {
    if (!rating) return "-";
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  const importConfig: ExcelImportConfig<Partial<Vendor>> = {
    title: "Import Vendors",
    description: "Upload an Excel file to bulk import vendors into the system.",
    columns: [
      { excelColumn: "Name", fieldName: "name", required: true },
      { excelColumn: "Code", fieldName: "code", required: true },
      {
        excelColumn: "Type",
        fieldName: "type",
        transform: (v) => {
          const val = String(v).toLowerCase().replace(/\s+/g, "_");
          if (["supplier", "manufacturer", "distributor", "service_provider"].includes(val)) return val;
          return "supplier";
        },
      },
      { excelColumn: "Email", fieldName: "email" },
      { excelColumn: "Phone", fieldName: "phone" },
      { excelColumn: "Website", fieldName: "website" },
      { excelColumn: "Address", fieldName: "address" },
      { excelColumn: "City", fieldName: "city" },
      { excelColumn: "Country", fieldName: "country" },
      { excelColumn: "Currency", fieldName: "currency" },
      {
        excelColumn: "Status",
        fieldName: "status",
        transform: (v) => {
          const val = String(v).toLowerCase();
          if (["pending", "active", "inactive", "blacklisted"].includes(val)) return val;
          return "pending";
        },
      },
      { excelColumn: "Notes", fieldName: "notes" },
    ],
    sampleData: [
      { Name: "Acme Supplies", Code: "ACM-001", Type: "supplier", Email: "contact@acme.com", Phone: "+1 555-0123", Website: "https://acme.com", Address: "123 Main St", City: "New York", Country: "USA", Currency: "USD", Status: "active", Notes: "" },
      { Name: "Tech Parts Inc", Code: "TPI-001", Type: "manufacturer", Email: "sales@techparts.com", Phone: "+1 555-0456", Website: "https://techparts.com", Address: "456 Oak Ave", City: "Boston", Country: "USA", Currency: "USD", Status: "pending", Notes: "" },
    ],
    validateRow: (row) => {
      if (!row.name || String(row.name).trim() === "") {
        return { valid: false, error: "Name is required" };
      }
      if (!row.code || String(row.code).trim() === "") {
        return { valid: false, error: "Code is required" };
      }
      return { valid: true };
    },
    onImport: async (items) => {
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const item of items) {
        try {
          await createVendor({
            name: String(item.name).trim(),
            code: String(item.code).trim(),
            type: (item.type as Vendor["type"]) || "supplier",
            email: item.email ? String(item.email).trim() : undefined,
            phone: item.phone ? String(item.phone).trim() : undefined,
            website: item.website ? String(item.website).trim() : undefined,
            address: item.address ? String(item.address).trim() : undefined,
            city: item.city ? String(item.city).trim() : undefined,
            country: item.country ? String(item.country).trim() : undefined,
            currency: item.currency ? String(item.currency).trim() : "USD",
            status: (item.status as Vendor["status"]) || "pending",
            notes: item.notes ? String(item.notes).trim() : undefined,
          });
          success++;
        } catch (err) {
          failed++;
          errors.push(`Failed to import "${item.name}": ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (success > 0) {
        loadVendors();
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
              {t("crm.vendors.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("crm.vendors.description")} ({totalElements} total)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm">
              <FileUp className="h-4 w-4" />
              Import Excel
            </Button>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="h-4 w-4" />
              {t("crm.vendors.addVendor")}
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
          <Select value={selectedStatus} onValueChange={(v: string | null) => { if (v !== null) { setSelectedStatus(v); setCurrentPage(1); } }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <span>{selectedStatus === "all" ? "All Statuses" : t(`crm.vendors.statuses.${selectedStatus}`)}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">{t("crm.vendors.statuses.pending")}</SelectItem>
              <SelectItem value="active">{t("crm.vendors.statuses.active")}</SelectItem>
              <SelectItem value="inactive">{t("crm.vendors.statuses.inactive")}</SelectItem>
              <SelectItem value="blacklisted">{t("crm.vendors.statuses.blacklisted")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mb-4 opacity-50" />
              <p>{t("crm.vendors.noVendors")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("crm.vendors.name")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("crm.vendors.type")}</TableHead>
                  <TableHead>{t("crm.vendors.status")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("crm.vendors.rating")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("crm.vendors.country")}</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{vendor.name}</p>
                          <p className="text-xs text-muted-foreground">{vendor.code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{t(`crm.vendors.types.${vendor.type}`)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[vendor.status] || ""}>
                        {t(`crm.vendors.statuses.${vendor.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {renderRating(vendor.rating)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {vendor.country || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(vendor)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(vendor)}
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
                {editingVendor ? t("crm.vendors.editVendor") : t("crm.vendors.addVendor")}
              </DialogTitle>
              <DialogDescription>
                {editingVendor ? "Update vendor information" : "Add a new vendor to your system"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vendor-name">
                    {t("crm.vendors.name")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="vendor-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Acme Supplies"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vendor-code">
                    {t("crm.vendors.code")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="vendor-code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="ACM-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>{t("crm.vendors.type")}</Label>
                  <Select value={formType} onValueChange={(v) => v !== null && setFormType(v)}>
                    <SelectTrigger>
                      <span>{t(`crm.vendors.types.${formType}`)}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier">{t("crm.vendors.types.supplier")}</SelectItem>
                      <SelectItem value="manufacturer">{t("crm.vendors.types.manufacturer")}</SelectItem>
                      <SelectItem value="distributor">{t("crm.vendors.types.distributor")}</SelectItem>
                      <SelectItem value="service_provider">{t("crm.vendors.types.service_provider")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t("crm.vendors.status")}</Label>
                  <Select value={formStatus} onValueChange={(v) => v !== null && setFormStatus(v)}>
                    <SelectTrigger>
                      <span>{t(`crm.vendors.statuses.${formStatus}`)}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t("crm.vendors.statuses.pending")}</SelectItem>
                      <SelectItem value="active">{t("crm.vendors.statuses.active")}</SelectItem>
                      <SelectItem value="inactive">{t("crm.vendors.statuses.inactive")}</SelectItem>
                      <SelectItem value="blacklisted">{t("crm.vendors.statuses.blacklisted")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vendor-email">{t("crm.vendors.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="vendor-email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contact@vendor.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vendor-phone">{t("crm.vendors.phone")}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="vendor-phone"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+1 555-0123"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vendor-website">{t("crm.vendors.website")}</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="vendor-website"
                      value={formWebsite}
                      onChange={(e) => setFormWebsite(e.target.value)}
                      placeholder="https://vendor.com"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vendor-address">{t("crm.vendors.address")}</Label>
                <Input
                  id="vendor-address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vendor-city">City</Label>
                  <Input
                    id="vendor-city"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vendor-country">{t("crm.vendors.country")}</Label>
                  <Input
                    id="vendor-country"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    placeholder="United States"
                  />
                </div>
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vendor-notes">Notes</Label>
                <Textarea
                  id="vendor-notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                />
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
