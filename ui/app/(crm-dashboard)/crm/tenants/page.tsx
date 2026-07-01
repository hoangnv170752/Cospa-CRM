"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Users,
  Loader2,
  Clock,
  Ban,
  AlertCircle,
  Eye,
  EyeOff,
  MoreHorizontal,
  PlayCircle,
  PauseCircle,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCrmAuth } from "@/contexts/crm-auth-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { EmailComposeDialog } from "@/components/email-compose-dialog";
import { sendTenantsEmail } from "@/lib/crm";

const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || "http://localhost:5001/api";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: "pending" | "active" | "suspended" | "cancelled";
  createdAt: string;
  adminUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  company?: {
    name: string;
    industry?: string;
  };
  usersCount?: number;
  companiesCount?: number;
  subscription?: {
    plan: { name: string };
  };
}

interface PaginatedResponse {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  suspended: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  active: <CheckCircle className="h-3 w-3" />,
  suspended: <AlertCircle className="h-3 w-3" />,
  cancelled: <Ban className="h-3 w-3" />,
};

export default function TenantsPage() {
  const { token, user } = useCrmAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pendingTenants, setPendingTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    domain: "",
    adminEmail: "",
    adminPassword: "",
    adminFirstName: "",
    adminLastName: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  // Email state
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [showEmailDialog, setShowEmailDialog] = useState(false);

  // Chat state
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [chatTenant, setChatTenant] = useState<Tenant | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
    isOwn: boolean;
  }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Check if user is sys_admin
  const isSysAdmin = user?.role === "sys_admin";

  const fetchTenants = async () => {
    if (!token) return;

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const response = await fetch(`${CRM_API_URL}/tenants?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch tenants");

      const data: PaginatedResponse = await response.json();
      setTenants(data.data);
    } catch (error) {
      toast.error("Failed to load tenants");
    }
  };

  const fetchPendingTenants = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${CRM_API_URL}/tenants/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch pending tenants");

      const data: PaginatedResponse = await response.json();
      setPendingTenants(data.data);
    } catch (error) {
      console.error("Failed to load pending tenants");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTenants(), fetchPendingTenants()]);
      setIsLoading(false);
    };
    loadData();
  }, [token, search, statusFilter]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build request body, only include non-empty fields
      const requestBody: Record<string, string> = {
        name: createForm.name,
        slug: createForm.slug,
      };
      if (createForm.domain) requestBody.domain = createForm.domain;
      if (createForm.adminEmail) requestBody.adminEmail = createForm.adminEmail;
      if (createForm.adminPassword) requestBody.adminPassword = createForm.adminPassword;
      if (createForm.adminFirstName) requestBody.adminFirstName = createForm.adminFirstName;
      if (createForm.adminLastName) requestBody.adminLastName = createForm.adminLastName;

      console.log("Creating tenant with data:", requestBody);
      const response = await fetch(`${CRM_API_URL}/tenants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();
      console.log("Response:", response.status, responseData);

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to create tenant");
      }

      toast.success("Tenant created successfully");
      setShowCreateDialog(false);
      setCreateForm({
        name: "",
        slug: "",
        domain: "",
        adminEmail: "",
        adminPassword: "",
        adminFirstName: "",
        adminLastName: "",
      });
      fetchTenants();
    } catch (error) {
      console.error("Create tenant error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create tenant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproval = async () => {
    if (!token || !selectedTenant) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${CRM_API_URL}/tenants/${selectedTenant.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: approvalAction,
          reason: rejectionReason,
          planCode: selectedPlan,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process approval");
      }

      toast.success(
        approvalAction === "approve"
          ? "Tenant approved successfully"
          : "Tenant rejected"
      );
      setShowApprovalDialog(false);
      setSelectedTenant(null);
      setRejectionReason("");
      fetchTenants();
      fetchPendingTenants();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process approval");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openApprovalDialog = (tenant: Tenant, action: "approve" | "reject") => {
    setSelectedTenant(tenant);
    setApprovalAction(action);
    setShowApprovalDialog(true);
  };

  const handleUpdateStatus = async (tenantId: string, newStatus: "active" | "suspended" | "cancelled") => {
    if (!token) return;

    try {
      const response = await fetch(`${CRM_API_URL}/tenants/${tenantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }

      toast.success(`Tenant status updated to ${newStatus}`);
      fetchTenants();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  // Chat functions
  const openChat = async (tenant: Tenant) => {
    setChatTenant(tenant);
    setChatMessages([]);
    setChatInput("");
    setShowChatDialog(true);

    if (!tenant.adminUser?.id) {
      toast.error("Tenant has no admin user to chat with");
      return;
    }

    try {
      // Find existing support conversation with this tenant's admin user
      const listRes = await fetch(`${CRM_API_URL}/messaging/conversations?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let foundConversationId: string | null = null;

      if (listRes.ok) {
        const listData = await listRes.json();
        // Find a support conversation where tenant admin is a participant
        const existingConv = listData.data?.find(
          (conv: { type: string; participants: Array<{ user: { id: string } }> }) =>
            conv.type === "support" &&
            conv.participants.some((p: { user: { id: string } }) => p.user.id === tenant.adminUser!.id)
        );
        if (existingConv) {
          foundConversationId = existingConv.id;
        }
      }

      // If no existing conversation, create one
      if (!foundConversationId) {
        const createRes = await fetch(`${CRM_API_URL}/messaging/conversations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            participantIds: [tenant.adminUser.id],
            title: `Support: ${tenant.name}`,
            type: "support",
          }),
        });

        if (createRes.ok) {
          const newConv = await createRes.json();
          foundConversationId = newConv.id;
        }
      }

      if (foundConversationId) {
        setConversationId(foundConversationId);

        // Load existing messages
        const convRes = await fetch(`${CRM_API_URL}/messaging/conversations/${foundConversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (convRes.ok) {
          const convData = await convRes.json();
          const currentUserId = user?.id;
          const msgs = (convData.messages || []).map((msg: {
            id: string;
            content: string;
            senderId: string;
            createdAt: string;
            sender: { id: string; firstName: string; lastName: string };
          }) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.sender?.id || msg.senderId,
            senderName: msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}`.trim() : "Unknown",
            createdAt: msg.createdAt,
            isOwn: msg.sender?.id === currentUserId || msg.senderId === currentUserId,
          }));
          setChatMessages(msgs);
        }
      }
    } catch (error) {
      console.error("Failed to open chat:", error);
      toast.error("Failed to start chat");
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !conversationId || isSendingChat) return;

    const content = chatInput.trim();
    setChatInput("");
    setIsSendingChat(true);

    // Optimistic update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content,
      senderId: user?.id || "",
      senderName: "You",
      createdAt: new Date().toISOString(),
      isOwn: true,
    };
    setChatMessages(prev => [...prev, tempMessage]);

    try {
      const response = await fetch(`${CRM_API_URL}/messaging/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        setChatMessages(prev =>
          prev.map(msg => msg.id === tempMessage.id ? {
            ...msg,
            id: savedMessage.id,
            senderName: savedMessage.sender
              ? `${savedMessage.sender.firstName} ${savedMessage.sender.lastName}`.trim()
              : "You",
          } : msg)
        );
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
      setChatMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    } finally {
      setIsSendingChat(false);
    }
  };


  if (!isSysAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You do not have permission to access this page. Only System
              Administrators can manage tenants.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage organizations and approve registration requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedTenants.size > 0 && (
            <Button variant="default" onClick={() => setShowEmailDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send Email ({selectedTenants.size})
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tenant
          </Button>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingTenants.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Clock className="h-5 w-5" />
              Pending Approvals ({pendingTenants.length})
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Organizations waiting for your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tenant.adminUser?.email} - {tenant.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => openApprovalDialog(tenant, "reject")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => openApprovalDialog(tenant, "approve")}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Tenants */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => v !== null && setStatusFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tenants found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={tenants.length > 0 && tenants.every(t => selectedTenants.has(t.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTenants(new Set(tenants.map(t => t.id)));
                        } else {
                          setSelectedTenants(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTenants.has(tenant.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedTenants);
                          if (checked) {
                            newSelected.add(tenant.id);
                          } else {
                            newSelected.delete(tenant.id);
                          }
                          setSelectedTenants(newSelected);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {tenant.adminUser ? (
                        <div>
                          <p className="text-sm">
                            {tenant.adminUser.firstName} {tenant.adminUser.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tenant.adminUser.email}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tenant.subscription?.plan?.name || (
                        <span className="text-muted-foreground">No plan</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {tenant.usersCount || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[tenant.status]} flex items-center gap-1 w-fit`}
                      >
                        {statusIcons[tenant.status]}
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openChat(tenant)}
                            className="text-blue-600"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Chat
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {tenant.status !== "active" && (
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(tenant.id, "active")}
                              className="text-green-600"
                            >
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {tenant.status !== "suspended" && tenant.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(tenant.id, "suspended")}
                              className="text-orange-600"
                            >
                              <PauseCircle className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          {tenant.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(tenant.id, "cancelled")}
                              className="text-red-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Tenant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Create a new organization with an admin account
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTenant}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={createForm.slug}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, slug: e.target.value })
                  }
                  pattern="^[a-z0-9-]+$"
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={createForm.domain}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, domain: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 border-t pt-4">
                <h4 className="font-medium mb-4">Admin Account (Optional)</h4>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminFirstName">First Name</Label>
                <Input
                  id="adminFirstName"
                  value={createForm.adminFirstName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, adminFirstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminLastName">Last Name</Label>
                <Input
                  id="adminLastName"
                  value={createForm.adminLastName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, adminLastName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={createForm.adminEmail}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, adminEmail: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    value={createForm.adminPassword}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, adminPassword: e.target.value })
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Tenant
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve Tenant" : "Reject Tenant"}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve"
                ? `Approve ${selectedTenant?.name} and activate their account`
                : `Reject ${selectedTenant?.name}'s registration request`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {approvalAction === "approve" ? (
              <div className="space-y-2">
                <Label>Assign Plan</Label>
                <Select value={selectedPlan} onValueChange={(v) => v !== null && setSelectedPlan(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Rejection Reason (Optional)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproval}
              disabled={isSubmitting}
              className={
                approvalAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {approvalAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Compose Dialog */}
      <EmailComposeDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        recipients={tenants
          .filter(t => selectedTenants.has(t.id))
          .map(t => ({
            id: t.id,
            email: t.adminUser?.email || "",
            firstName: t.adminUser?.firstName,
            lastName: t.adminUser?.lastName,
            name: t.name,
          }))}
        type="tenants"
        onSend={async (data) => {
          await sendTenantsEmail({
            tenantIds: Array.from(selectedTenants),
            ...data,
          });
          setSelectedTenants(new Set());
        }}
      />

      {/* Chat Dialog */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent showCloseButton={false} className="max-w-2xl h-[600px] flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <DialogTitle>Chat with {chatTenant?.name}</DialogTitle>
                  <DialogDescription className="text-xs">
                    Real-time support conversation
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChatDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No messages yet</p>
                  <p className="text-xs">Start the conversation below</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex flex-col max-w-[80%]">
                      {!msg.isOwn && (
                        <span className="text-[10px] text-muted-foreground mb-0.5">
                          {msg.senderName}
                        </span>
                      )}
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          msg.isOwn
                            ? "bg-indigo-600 text-white"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${
                          msg.isOwn ? "text-indigo-200" : "text-muted-foreground"
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isSendingChat && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-4 py-3 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isSendingChat}
              />
              <Button type="submit" disabled={!chatInput.trim() || isSendingChat}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
