"use client";

import { useEffect, useState } from "react";
import { useCrmAuth } from "@/contexts/crm-auth-context";
import { crmFetch } from "@/lib/crm";
import {
  History,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  User,
  Building2,
  Calendar,
  FileJson,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AuditLogUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuditLogTenant {
  id: string;
  name: string;
  slug: string;
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: AuditLogUser | null;
  tenant: AuditLogTenant | null;
}

interface AuditLogsResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const actionColors: Record<string, string> = {
  create: "bg-green-500",
  update: "bg-blue-500",
  delete: "bg-red-500",
  login: "bg-purple-500",
  logout: "bg-gray-500",
};

const actionLabels: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  login: "Login",
  logout: "Logout",
};

export default function AuditLogsPage() {
  const { user } = useCrmAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const limit = 20;

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (resourceFilter && resourceFilter !== "all") {
          params.append("resource", resourceFilter);
        }

        if (actionFilter && actionFilter !== "all") {
          params.append("action", actionFilter);
        }

        const data = await crmFetch<AuditLogsResponse>(
          `/audit-logs?${params.toString()}`
        );

        setLogs(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error("Failed to load audit logs:", err);
        setError("Failed to load audit logs");
      } finally {
        setIsLoading(false);
      }
    }

    loadLogs();
  }, [page, resourceFilter, actionFilter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.resource.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.user?.email.toLowerCase().includes(search) ||
      log.user?.firstName.toLowerCase().includes(search) ||
      log.user?.lastName.toLowerCase().includes(search) ||
      log.tenant?.name.toLowerCase().includes(search)
    );
  });

  const uniqueResources = [...new Set(logs.map((l) => l.resource))];

  // Check if user is SysAdmin (after all hooks)
  if (user?.role !== "sys_admin") {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            Only System Administrators can view audit logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <History className="h-6 w-6" />
              Audit Logs
            </h1>
            <p className="text-sm text-muted-foreground">
              View system-wide activity history and changes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{total} total logs</Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by user, resource, or tenant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={resourceFilter} onValueChange={(v) => v !== null && setResourceFilter(v)}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Resource" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    {uniqueResources.map((resource) => (
                      <SelectItem key={resource} value={resource}>
                        {resource}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={(v) => v !== null && setActionFilter(v)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Logs Table */}
        {!isLoading && !error && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Timestamp
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Resource
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Tenant
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No audit logs found
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm whitespace-nowrap">
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {log.user ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {log.user.firstName} {log.user.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {log.user.email}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                System
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              className={`${
                                actionColors[log.action] || "bg-gray-500"
                              } text-white`}
                            >
                              {actionLabels[log.action] || log.action}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium capitalize">
                                {log.resource}
                              </p>
                              {log.resourceId && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  {log.resourceId.substring(0, 8)}...
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {log.tenant ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{log.tenant.name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                -
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Dialog>
                              <DialogTrigger
                                render={<Button variant="ghost" size="sm" />}
                                onClick={() => setSelectedLog(log)}
                              >
                                <FileJson className="h-4 w-4 mr-1" />
                                View
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                                <DialogHeader>
                                  <DialogTitle>Audit Log Details</DialogTitle>
                                  <DialogDescription>
                                    {formatDate(log.createdAt)} - {log.action} on{" "}
                                    {log.resource}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {log.oldValues && (
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        Previous Values
                                      </h4>
                                      <pre className="p-3 rounded-lg bg-muted text-xs overflow-auto max-h-[200px]">
                                        {JSON.stringify(log.oldValues, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.newValues && (
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        New Values
                                      </h4>
                                      <pre className="p-3 rounded-lg bg-muted text-xs overflow-auto max-h-[200px]">
                                        {JSON.stringify(log.newValues, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.metadata && (
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        Metadata
                                      </h4>
                                      <pre className="p-3 rounded-lg bg-muted text-xs overflow-auto max-h-[200px]">
                                        {JSON.stringify(log.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, total)} of {total} logs
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
