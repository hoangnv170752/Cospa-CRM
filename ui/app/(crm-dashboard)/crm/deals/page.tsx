"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ChevronLeft, ChevronRight, Search, Plus, HandCoins, DollarSign, Building2, Users, FileUp } from "lucide-react";
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
import { fetchDeals, createDeal, updateDeal, deleteDeal, Deal, fetchCompanies, Company, fetchContacts, Contact } from "@/lib/crm";

const PAGE_SIZE = 10;

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-slate-500/10 text-slate-600",
  qualified: "bg-blue-500/10 text-blue-600",
  proposal: "bg-amber-500/10 text-amber-600",
  negotiation: "bg-purple-500/10 text-purple-600",
  closed_won: "bg-green-500/10 text-green-600",
  closed_lost: "bg-red-500/10 text-red-600",
};

export default function DealsPage() {
  const t = useTranslations();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formStage, setFormStage] = useState("lead");
  const [formProbability, setFormProbability] = useState("");
  const [formExpectedCloseDate, setFormExpectedCloseDate] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formContactId, setFormContactId] = useState("");
  const [formNotes, setFormNotes] = useState("");

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
      const [companiesRes, contactsRes] = await Promise.all([
        fetchCompanies({ limit: 100 }),
        fetchContacts({ limit: 100 }),
      ]);
      setCompanies(companiesRes.data);
      setContacts(contactsRes.data);
    } catch (error) {
      console.error("Failed to load related data:", error);
    }
  }, []);

  const loadDeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchDeals({
        page: currentPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        stage: selectedStage !== "all" ? selectedStage : undefined,
      });
      setDeals(response.data);
      setTotalPages(response.totalPages);
      setTotalElements(response.total);
    } catch (error) {
      console.error("Failed to load deals:", error);
      toast.error("Failed to load deals");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedStage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRelated();
  }, [loadRelated]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDeals();
  }, [loadDeals]);

  const resetForm = () => {
    setFormTitle("");
    setFormValue("");
    setFormCurrency("USD");
    setFormStage("lead");
    setFormProbability("");
    setFormExpectedCloseDate("");
    setFormCompanyId("");
    setFormContactId("");
    setFormNotes("");
    setEditingDeal(null);
  };

  const handleOpenDialog = (deal?: Deal) => {
    if (deal) {
      setEditingDeal(deal);
      setFormTitle(deal.title);
      setFormValue(deal.value.toString());
      setFormCurrency(deal.currency);
      setFormStage(deal.stage);
      setFormProbability(deal.probability?.toString() || "");
      setFormExpectedCloseDate(deal.expectedCloseDate?.split("T")[0] || "");
      setFormCompanyId(deal.companyId || "");
      setFormContactId(deal.contactId || "");
      setFormNotes(deal.notes || "");
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
    if (!formTitle.trim()) {
      toast.error("Deal title is required");
      return;
    }
    if (!formValue || isNaN(Number(formValue))) {
      toast.error("Valid deal value is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        title: formTitle.trim(),
        value: Number(formValue),
        currency: formCurrency,
        stage: formStage as Deal["stage"],
        probability: formProbability ? Number(formProbability) : undefined,
        expectedCloseDate: formExpectedCloseDate || undefined,
        companyId: formCompanyId || undefined,
        contactId: formContactId || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (editingDeal) {
        await updateDeal(editingDeal.id, data);
        toast.success("Deal updated");
      } else {
        await createDeal(data);
        toast.success("Deal created");
      }
      handleCloseDialog();
      loadDeals();
    } catch (error) {
      console.error("Failed to save deal:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save deal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (deal: Deal) => {
    if (!confirm(`Delete "${deal.title}"?`)) return;

    try {
      await deleteDeal(deal.id);
      toast.success("Deal deleted");
      loadDeals();
    } catch (error) {
      console.error("Failed to delete deal:", error);
      toast.error("Failed to delete deal");
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const tImport = t.raw("crm.import.columns");
  const importConfig: ExcelImportConfig<Partial<Deal>> = {
    entityType: "deals",
    columns: [
      { excelColumn: tImport.title, fieldName: "title", required: true },
      {
        excelColumn: tImport.value,
        fieldName: "value",
        required: true,
        transform: (v) => parseFloat(String(v)) || 0,
      },
      { excelColumn: "Currency", fieldName: "currency" },
      {
        excelColumn: tImport.stage,
        fieldName: "stage",
        transform: (v) => {
          const val = String(v).toLowerCase().replace(/\s+/g, "_");
          if (["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"].includes(val)) return val;
          return "lead";
        },
      },
      {
        excelColumn: tImport.probability,
        fieldName: "probability",
        transform: (v) => {
          const num = parseFloat(String(v));
          return isNaN(num) ? undefined : num;
        },
      },
      { excelColumn: tImport.expectedCloseDate, fieldName: "expectedCloseDate" },
      { excelColumn: tImport.notes, fieldName: "notes" },
    ],
    sampleData: [
      { [tImport.title]: "Enterprise Deal", [tImport.value]: 50000, Currency: "USD", [tImport.stage]: "proposal", [tImport.probability]: 60, [tImport.expectedCloseDate]: "2025-03-01", [tImport.notes]: "" },
      { [tImport.title]: "SMB License", [tImport.value]: 5000, Currency: "USD", [tImport.stage]: "qualified", [tImport.probability]: 40, [tImport.expectedCloseDate]: "2025-02-15", [tImport.notes]: "" },
    ],
    validateRow: (row) => {
      if (!row.title || String(row.title).trim() === "") {
        return { valid: false, error: tImport.title + " is required" };
      }
      if (row.value === undefined || row.value === null) {
        return { valid: false, error: tImport.value + " is required" };
      }
      return { valid: true };
    },
    onImport: async (items) => {
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const item of items) {
        try {
          await createDeal({
            title: String(item.title).trim(),
            value: Number(item.value),
            currency: item.currency ? String(item.currency).trim() : "USD",
            stage: (item.stage as Deal["stage"]) || "lead",
            probability: item.probability as number | undefined,
            expectedCloseDate: item.expectedCloseDate ? String(item.expectedCloseDate) : undefined,
            notes: item.notes ? String(item.notes).trim() : undefined,
          });
          success++;
        } catch (err) {
          failed++;
          errors.push(`Failed to import "${item.title}": ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (success > 0) {
        loadDeals();
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
              {t("crm.deals.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("crm.deals.description")} ({totalElements} total)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm">
              <FileUp className="h-4 w-4" />
              {t("crm.import.button")}
            </Button>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="h-4 w-4" />
              {t("crm.deals.addDeal")}
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
          <Select value={selectedStage} onValueChange={(v: string | null) => { if (v !== null) { setSelectedStage(v); setCurrentPage(1); } }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <span>{selectedStage === "all" ? "All Stages" : t(`crm.deals.stages.${selectedStage}`)}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="lead">{t("crm.deals.stages.lead")}</SelectItem>
              <SelectItem value="qualified">{t("crm.deals.stages.qualified")}</SelectItem>
              <SelectItem value="proposal">{t("crm.deals.stages.proposal")}</SelectItem>
              <SelectItem value="negotiation">{t("crm.deals.stages.negotiation")}</SelectItem>
              <SelectItem value="closed_won">{t("crm.deals.stages.closed_won")}</SelectItem>
              <SelectItem value="closed_lost">{t("crm.deals.stages.closed_lost")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <HandCoins className="h-12 w-12 mb-4 opacity-50" />
              <p>{t("crm.deals.noDeals")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("crm.deals.dealTitle")}</TableHead>
                  <TableHead>{t("crm.deals.value")}</TableHead>
                  <TableHead>{t("crm.deals.stage")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("crm.deals.company")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("crm.deals.expectedClose")}</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{deal.title}</p>
                        {deal.contact && (
                          <p className="text-xs text-muted-foreground">
                            {deal.contact.firstName} {deal.contact.lastName}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatCurrency(deal.value, deal.currency)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STAGE_COLORS[deal.stage] || ""}>
                        {t(`crm.deals.stages.${deal.stage}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {deal.company ? (
                        <span className="text-sm">{deal.company.name}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatDate(deal.expectedCloseDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(deal)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(deal)}
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
                {editingDeal ? t("crm.deals.editDeal") : t("crm.deals.addDeal")}
              </DialogTitle>
              <DialogDescription>
                {editingDeal ? "Update deal information" : "Add a new deal to your pipeline"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deal-title">
                  {t("crm.deals.dealTitle")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deal-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Enterprise license deal"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="deal-value">
                    {t("crm.deals.value")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="deal-value"
                    type="number"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="10000"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Currency</Label>
                  <Select value={formCurrency} onValueChange={(v) => v && setFormCurrency(v)}>
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
                <Label>{t("crm.deals.stage")}</Label>
                <Select value={formStage} onValueChange={(v) => v && setFormStage(v)}>
                  <SelectTrigger>
                    <span>{t(`crm.deals.stages.${formStage}`)}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">{t("crm.deals.stages.lead")}</SelectItem>
                    <SelectItem value="qualified">{t("crm.deals.stages.qualified")}</SelectItem>
                    <SelectItem value="proposal">{t("crm.deals.stages.proposal")}</SelectItem>
                    <SelectItem value="negotiation">{t("crm.deals.stages.negotiation")}</SelectItem>
                    <SelectItem value="closed_won">{t("crm.deals.stages.closed_won")}</SelectItem>
                    <SelectItem value="closed_lost">{t("crm.deals.stages.closed_lost")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="deal-probability">{t("crm.deals.probability")} (%)</Label>
                  <Input
                    id="deal-probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formProbability}
                    onChange={(e) => setFormProbability(e.target.value)}
                    placeholder="50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="deal-close-date">{t("crm.deals.expectedClose")}</Label>
                  <Input
                    id="deal-close-date"
                    type="date"
                    value={formExpectedCloseDate}
                    onChange={(e) => setFormExpectedCloseDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t("crm.deals.company")}</Label>
                <Select value={formCompanyId} onValueChange={(v) => v && setFormCompanyId(v)}>
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

              <div className="flex flex-col gap-1.5">
                <Label>{t("crm.deals.contact")}</Label>
                <Select value={formContactId} onValueChange={(v) => v && setFormContactId(v)}>
                  <SelectTrigger>
                    <span>
                      {formContactId
                        ? (() => {
                            const c = contacts.find((c) => c.id === formContactId);
                            return c ? `${c.firstName} ${c.lastName}` : "Select contact";
                          })()
                        : "Select contact"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deal-notes">Notes</Label>
                <Textarea
                  id="deal-notes"
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
