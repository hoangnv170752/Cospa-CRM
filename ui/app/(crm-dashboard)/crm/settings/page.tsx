"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useCrmAuth } from "@/contexts/crm-auth-context";
import { crmFetch } from "@/lib/crm";
import {
  User,
  CreditCard,
  Shield,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Save,
  Camera,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AdminChatCard } from "@/components/admin-chat-card";

interface Plan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number | null;
  maxDevices: number | null;
  maxAssets: number | null;
  maxStorageGb: number | null;
  features: string[];
}

interface Subscription {
  id: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string | null;
  plan: Plan;
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  status: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    primaryColor: string | null;
  } | null;
  subscription: Subscription | null;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500",
  trialing: "bg-blue-500",
  past_due: "bg-yellow-500",
  cancelled: "bg-red-500",
  unpaid: "bg-red-500",
  paused: "bg-gray-500",
};

const roleLabels: Record<string, string> = {
  sys_admin: "System Administrator",
  tenant_admin: "Tenant Administrator",
  tenant_user: "Tenant User",
  customer_user: "Customer User",
};

export default function SettingsPage() {
  const { user: authUser } = useCrmAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Avatar state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await crmFetch<UserProfile>("/auth/me");
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setPhone(data.phone || "");
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await crmFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ firstName, lastName, phone: phone || null }),
      });

      setSuccessMessage("Profile updated");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || "http://localhost:5001/api";
      const token = localStorage.getItem("crm_token");

      const response = await fetch(`${CRM_API_URL}/users/${profile.id}/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const data = await response.json();
      setProfile({ ...profile, avatar: data.avatar });
      toast.success("Avatar updated successfully");
    } catch (err) {
      console.error("Avatar upload failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile?.avatar) return;

    setIsUploadingAvatar(true);

    try {
      const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || "http://localhost:5001/api";
      const token = localStorage.getItem("crm_token");

      const response = await fetch(`${CRM_API_URL}/users/${profile.id}/avatar`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove avatar");
      }

      setProfile({ ...profile, avatar: null });
      toast.success("Avatar removed");
    } catch (err) {
      console.error("Avatar removal failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Min 8 characters");
      return;
    }

    setIsSaving(true);

    try {
      await crmFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      setSuccessMessage("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      console.error("Failed to change password:", err);
      if (err instanceof Error && err.message.includes("incorrect")) {
        setPasswordError("Current password incorrect");
      } else {
        setPasswordError("Failed to change password");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const showSubscription = profile?.subscription || authUser?.role !== "sys_admin";
  const showSupportChat = authUser?.role !== "sys_admin";

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your account</p>
          </div>
          {successMessage && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-600 text-xs">
              <Check className="h-3 w-3" />
              {successMessage}
            </div>
          )}
        </div>

        {/* Profile & Password Row */}
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Profile */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {/* Avatar Section */}
              <div className="flex items-center gap-3 pb-2">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                    {profile?.avatar ? (
                      <Image
                        src={profile.avatar}
                        alt="Avatar"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Upload Photo
                  </Button>
                  {profile?.avatar && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Email</Label>
                <Input value={profile?.email || ""} disabled className="h-7 text-xs bg-muted" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Badge variant="outline" className="text-[10px] h-5">{roleLabels[profile?.role || ""] || profile?.role}</Badge>
                {profile?.tenant && <Badge variant="secondary" className="text-[10px] h-5">{profile.tenant.name}</Badge>}
              </div>
              <Button onClick={handleSaveProfile} disabled={isSaving} size="sm" className="w-full h-7 text-xs">
                {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Password
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {passwordError && (
                <div className="p-1.5 rounded bg-red-500/10 text-red-600 text-[10px]">{passwordError}</div>
              )}
              <div>
                <Label className="text-[10px] text-muted-foreground">Current</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-7 text-xs pr-7"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">New</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-7 text-xs pr-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Confirm</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                size="sm"
                className="w-full h-7 text-xs"
              >
                {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Shield className="h-3 w-3 mr-1" />}
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Row */}
        {showSubscription && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {profile?.subscription ? (
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Plan Info */}
                  <div className="flex items-center justify-between p-3 rounded border bg-muted/30 lg:min-w-[280px]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{profile.subscription.plan.name}</span>
                        <Badge className={`${statusColors[profile.subscription.status]} text-white text-[10px] h-4`}>
                          {profile.subscription.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{profile.subscription.plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        ${profile.subscription.billingCycle === "monthly"
                          ? profile.subscription.plan.monthlyPrice
                          : profile.subscription.plan.yearlyPrice}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        /{profile.subscription.billingCycle === "monthly" ? "mo" : "yr"}
                      </p>
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="flex gap-2 flex-wrap lg:flex-nowrap">
                    <div className="p-2 rounded bg-muted/50 text-center min-w-[70px]">
                      <p className="text-[10px] text-muted-foreground">Users</p>
                      <p className="font-semibold text-sm">{profile.subscription.plan.maxUsers ?? "∞"}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center min-w-[70px]">
                      <p className="text-[10px] text-muted-foreground">Devices</p>
                      <p className="font-semibold text-sm">{profile.subscription.plan.maxDevices ?? "∞"}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center min-w-[70px]">
                      <p className="text-[10px] text-muted-foreground">Assets</p>
                      <p className="font-semibold text-sm">{profile.subscription.plan.maxAssets ?? "∞"}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center min-w-[70px]">
                      <p className="text-[10px] text-muted-foreground">Storage</p>
                      <p className="font-semibold text-sm">{profile.subscription.plan.maxStorageGb ? `${profile.subscription.plan.maxStorageGb}G` : "∞"}</p>
                    </div>
                  </div>

                  {/* Features */}
                  {profile.subscription.plan.features.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                      {profile.subscription.plan.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">No subscription</p>
                  <p className="text-[10px] text-muted-foreground">Contact admin</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Support Chat - Only for non-root users */}
        {showSupportChat && profile && (
          <AdminChatCard
            userId={profile.id}
            tenantId={profile.tenant?.id}
            tenantName={profile.tenant?.name}
          />
        )}
      </div>
    </div>
  );
}
