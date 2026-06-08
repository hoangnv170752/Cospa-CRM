"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ChevronLeft, ChevronRight, Search, Plus, Users, Mail, Phone, Building2, FileUp, Send } from "lucide-react";
import { ExcelImportDialog, ExcelImportConfig } from "@/components/excel-import-dialog";
import { EmailComposeDialog } from "@/components/email-compose-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { fetchContacts, createContact, updateContact, deleteContact, Contact, fetchCompanies, Company, sendContactsEmail } from "@/lib/crm";

const PAGE_SIZE = 10;

export default function ContactsPage() {
  const t = useTranslations();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Selection state for bulk email
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  // Form state
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formCompanyId, setFormCompanyId] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadCompanies = useCallback(async () => {
    try {
      const response = await fetchCompanies({ limit: 100 });
      setCompanies(response.data);
    } catch (error) {
      console.error("Failed to load companies:", error);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchContacts({
        page: currentPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setContacts(response.data);
      setTotalPages(response.totalPages);
      setTotalElements(response.total);
    } catch (error) {
      console.error("Failed to load contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContacts();
  }, [loadContacts]);

  const resetForm = () => {
    setFormFirstName("");
    setFormLastName("");
    setFormEmail("");
    setFormPhone("");
    setFormPosition("");
    setFormCompanyId("");
    setFormNotes("");
    setEditingContact(null);
  };

  const handleOpenDialog = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setFormFirstName(contact.firstName);
      setFormLastName(contact.lastName);
      setFormEmail(contact.email);
      setFormPhone(contact.phone || "");
      setFormPosition(contact.position || "");
      setFormCompanyId(contact.companyId || "");
      setFormNotes(contact.notes || "");
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
    if (!formFirstName.trim() || !formLastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    if (!formEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        firstName: formFirstName.trim(),
        lastName: formLastName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || undefined,
        position: formPosition.trim() || undefined,
        companyId: formCompanyId || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (editingContact) {
        await updateContact(editingContact.id, data);
        toast.success("Contact updated");
      } else {
        await createContact(data);
        toast.success("Contact created");
      }
      handleCloseDialog();
      loadContacts();
    } catch (error) {
      console.error("Failed to save contact:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save contact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (contact: Contact) => {
    if (!confirm(`Delete "${contact.firstName} ${contact.lastName}"?`)) return;

    try {
      await deleteContact(contact.id);
      toast.success("Contact deleted");
      loadContacts();
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast.error("Failed to delete contact");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const tImport = t.raw("crm.import.columns");
  const importConfig: ExcelImportConfig<Partial<Contact>> = {
    entityType: "contacts",
    columns: [
      { excelColumn: tImport.firstName, fieldName: "firstName", required: true },
      { excelColumn: tImport.lastName, fieldName: "lastName", required: true },
      { excelColumn: tImport.email, fieldName: "email", required: true },
      { excelColumn: tImport.phone, fieldName: "phone" },
      { excelColumn: tImport.position, fieldName: "position" },
      { excelColumn: tImport.notes, fieldName: "notes" },
    ],
    sampleData: [
      { [tImport.firstName]: "John", [tImport.lastName]: "Doe", [tImport.email]: "john.doe@example.com", [tImport.phone]: "+1 555-0123", [tImport.position]: "Manager", [tImport.notes]: "" },
      { [tImport.firstName]: "Jane", [tImport.lastName]: "Smith", [tImport.email]: "jane.smith@example.com", [tImport.phone]: "+1 555-0456", [tImport.position]: "Developer", [tImport.notes]: "" },
    ],
    validateRow: (row) => {
      if (!row.firstName || String(row.firstName).trim() === "") {
        return { valid: false, error: tImport.firstName + " is required" };
      }
      if (!row.lastName || String(row.lastName).trim() === "") {
        return { valid: false, error: tImport.lastName + " is required" };
      }
      if (!row.email || String(row.email).trim() === "") {
        return { valid: false, error: tImport.email + " is required" };
      }
      return { valid: true };
    },
    onImport: async (items) => {
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const item of items) {
        try {
          await createContact({
            firstName: String(item.firstName).trim(),
            lastName: String(item.lastName).trim(),
            email: String(item.email).trim(),
            phone: item.phone ? String(item.phone).trim() : undefined,
            position: item.position ? String(item.position).trim() : undefined,
            notes: item.notes ? String(item.notes).trim() : undefined,
          });
          success++;
        } catch (err) {
          failed++;
          errors.push(`Failed to import "${item.firstName} ${item.lastName}": ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      if (success > 0) {
        loadContacts();
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
              {t("crm.contacts.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("crm.contacts.description")} ({totalElements} total)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedContacts.size > 0 && (
              <Button variant="default" onClick={() => setEmailDialogOpen(true)} size="sm">
                <Send className="h-4 w-4" />
                Send Email ({selectedContacts.size})
              </Button>
            )}
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm">
              <FileUp className="h-4 w-4" />
              {t("crm.import.button")}
            </Button>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="h-4 w-4" />
              {t("crm.contacts.addContact")}
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
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-50" />
              <p>{t("crm.contacts.noContacts")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={contacts.length > 0 && contacts.every(c => selectedContacts.has(c.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedContacts(new Set(contacts.map(c => c.id)));
                        } else {
                          setSelectedContacts(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("crm.contacts.email")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("crm.contacts.company")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("crm.contacts.position")}</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedContacts.has(contact.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedContacts);
                          if (checked) {
                            newSelected.add(contact.id);
                          } else {
                            newSelected.delete(contact.id);
                          }
                          setSelectedContacts(newSelected);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{contact.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
                        {contact.email}
                      </a>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {contact.company ? (
                        <Badge variant="secondary">
                          <Building2 className="h-3 w-3 mr-1" />
                          {contact.company.name}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {contact.position || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatDate(contact.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(contact)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(contact)}
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
                {editingContact ? t("crm.contacts.editContact") : t("crm.contacts.addContact")}
              </DialogTitle>
              <DialogDescription>
                {editingContact ? "Update contact information" : "Add a new contact to your CRM"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contact-firstname">
                    {t("crm.contacts.firstName")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contact-firstname"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    placeholder="John"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contact-lastname">
                    {t("crm.contacts.lastName")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contact-lastname"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-email">
                  {t("crm.contacts.email")} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contact-email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-phone">{t("crm.contacts.phone")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contact-phone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 555-0123"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-position">{t("crm.contacts.position")}</Label>
                <Input
                  id="contact-position"
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                  placeholder="Software Engineer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t("crm.contacts.company")}</Label>
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-notes">{t("crm.contacts.notes")}</Label>
                <Textarea
                  id="contact-notes"
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

        {/* Email Compose Dialog */}
        <EmailComposeDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          recipients={contacts.filter(c => selectedContacts.has(c.id))}
          type="contacts"
          onSend={async (data) => {
            await sendContactsEmail({
              contactIds: Array.from(selectedContacts),
              ...data,
            });
            setSelectedContacts(new Set());
          }}
        />
      </div>
    </div>
  );
}
