"use client";

import { useState } from "react";
import { Loader2, Mail, Send, Eye, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Recipient {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    subject: "Welcome to Cospa CRM!",
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #333;">Welcome, {{firstName}}!</h1>
  <p>We're excited to have you on board.</p>
  <p>If you have any questions, feel free to reach out to us.</p>
  <p>Best regards,<br/>The Cospa CRM Team</p>
</div>`,
  },
  {
    id: "newsletter",
    name: "Newsletter",
    subject: "Monthly Newsletter",
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #333;">Hello {{firstName}},</h1>
  <p>Here's what's new this month:</p>
  <ul>
    <li>Feature update 1</li>
    <li>Feature update 2</li>
    <li>Feature update 3</li>
  </ul>
  <p>Thanks for being with us!</p>
  <p>Best regards,<br/>The Cospa CRM Team</p>
</div>`,
  },
  {
    id: "promotion",
    name: "Promotion",
    subject: "Special Offer Just for You!",
    htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #333;">Hi {{firstName}}!</h1>
  <p>We have a special offer just for you.</p>
  <p style="font-size: 24px; color: #e74c3c; font-weight: bold;">Get 20% OFF</p>
  <p>Use code: <strong>SPECIAL20</strong></p>
  <p>Best regards,<br/>The Cospa CRM Team</p>
</div>`,
  },
  {
    id: "custom",
    name: "Custom Email",
    subject: "",
    htmlContent: "",
  },
];

interface EmailComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Recipient[];
  type: "contacts" | "tenants";
  onSend: (data: {
    subject: string;
    htmlContent: string;
    textContent?: string;
    fromName?: string;
  }) => Promise<void>;
}

export function EmailComposeDialog({
  open,
  onOpenChange,
  recipients,
  type,
  onSend,
}: EmailComposeDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [fromName, setFromName] = useState("Cospa CRM");
  const [isSending, setIsSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleTemplateChange = (templateId: string | null) => {
    if (!templateId) return;
    setSelectedTemplate(templateId);
    const template = DEFAULT_TEMPLATES.find((t) => t.id === templateId);
    if (template && templateId !== "custom") {
      setSubject(template.subject);
      setHtmlContent(template.htmlContent);
    }
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!htmlContent.trim()) {
      toast.error("Email content is required");
      return;
    }

    setIsSending(true);
    try {
      await onSend({
        subject,
        htmlContent,
        fromName: fromName.trim() || undefined,
      });
      toast.success(`Email sent to ${recipients.length} ${type}`);
      onOpenChange(false);
      // Reset form
      setSelectedTemplate("custom");
      setSubject("");
      setHtmlContent("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const getPreviewHtml = () => {
    const sampleRecipient = recipients[0] || {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      name: "Sample Tenant",
    };

    return htmlContent
      .replace(/{{firstName}}/g, sampleRecipient.firstName || "")
      .replace(/{{lastName}}/g, sampleRecipient.lastName || "")
      .replace(/{{email}}/g, sampleRecipient.email || "")
      .replace(/{{tenantName}}/g, sampleRecipient.name || "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {type === "contacts" ? "Send Email to Contacts" : "Send Email to Tenants"}
          </DialogTitle>
          <DialogDescription>
            Compose and send email to {recipients.length} {type}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Recipients preview */}
          <div className="flex flex-wrap gap-1 p-2 bg-muted rounded-md max-h-20 overflow-y-auto">
            {recipients.slice(0, 10).map((r, i) => (
              <Badge key={r.id || i} variant="secondary" className="text-xs">
                {r.firstName && r.lastName
                  ? `${r.firstName} ${r.lastName}`
                  : r.name || r.email}
              </Badge>
            ))}
            {recipients.length > 10 && (
              <Badge variant="outline" className="text-xs">
                +{recipients.length - 10} more
              </Badge>
            )}
          </div>

          {/* Template selector */}
          <div className="flex flex-col gap-1.5">
            <Label>Email Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <span>
                  {DEFAULT_TEMPLATES.find((t) => t.id === selectedTemplate)?.name ||
                    "Select template"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from-name">From Name</Label>
            <Input
              id="from-name"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Cospa CRM"
            />
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-subject">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject"
            />
          </div>

          {/* Content toggle */}
          <div className="flex items-center justify-between">
            <Label>
              Email Content <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={!previewMode ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPreviewMode(false)}
              >
                <Code className="h-4 w-4 mr-1" />
                HTML
              </Button>
              <Button
                type="button"
                variant={previewMode ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPreviewMode(true)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
            </div>
          </div>

          {/* Content editor / preview */}
          {previewMode ? (
            <div
              className="border rounded-md p-4 min-h-[200px] bg-white"
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
            />
          ) : (
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Enter HTML content. Use {{firstName}}, {{lastName}}, {{email}}, {{tenantName}} for personalization."
              rows={10}
              className="font-mono text-sm"
            />
          )}

          {/* Variables help */}
          <div className="text-xs text-muted-foreground">
            Available variables:{" "}
            <code className="bg-muted px-1 rounded">{"{{firstName}}"}</code>{" "}
            <code className="bg-muted px-1 rounded">{"{{lastName}}"}</code>{" "}
            <code className="bg-muted px-1 rounded">{"{{email}}"}</code>
            {type === "tenants" && (
              <> <code className="bg-muted px-1 rounded">{"{{tenantName}}"}</code></>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send to {recipients.length} {type}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
