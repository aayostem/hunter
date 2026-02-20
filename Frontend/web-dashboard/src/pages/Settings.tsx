// pages/Settings.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  Mail,
  Shield,
  Bell,
  CreditCard,
  Key,
  Users,
  Palette,
  Webhook,
  Save,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Camera,
  Loader,
  X,
  Copy,
  Trash2,
  Edit,
  Plus,
  Download,
  Globe,
  Smartphone,
  Laptop,
  Tablet,
  Moon,
  Sun,
  Monitor,
  MessageCircle,
} from "lucide-react";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { StatusBadge } from "../components/StatusBadge";
import { trackEvent } from "../utils/analytics";
import { logError } from "../utils/logging";
import { formatDate, formatDateTime } from "../utils/formatters";
import {validateEmail} from "../utils/validators";

// Types
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  company: string | null;
  phone: string | null;
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact";
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  email: {
    opens: boolean;
    clicks: boolean;
    unsubscribes: boolean;
    bounces: boolean;
    complaints: boolean;
    campaignCompleted: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
    systemAlerts: boolean;
    securityAlerts: boolean;
  };
  browser: {
    enabled: boolean;
    opens: boolean;
    clicks: boolean;
    campaignCompleted: boolean;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    opens: boolean;
    clicks: boolean;
    unsubscribes: boolean;
    bounces: boolean;
  };
  webhook: {
    enabled: boolean;
    url: string;
    events: string[];
    secret: string;
  };
}

interface SMTPSettings {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: "none" | "ssl" | "tls";
  fromEmail: string;
  fromName: string;
  replyTo: string;
  isDefault: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "pending" | "inactive";
  avatar: string | null;
  lastActive: string | null;
  permissions: string[];
  createdAt: string;
}

interface APIKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  lastCharacters: string;
  permissions: string[];
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  description: string;
  events: string[];
  status: "active" | "inactive" | "failing";
  secret: string;
  createdAt: string;
  lastTriggered: string | null;
  failureCount: number;
}

interface BillingInfo {
  plan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: "month" | "year";
    features: string[];
  };
  status: "active" | "past_due" | "canceled" | "trial";
  nextBillingDate: string;
  paymentMethod: {
    type: "card" | "paypal" | "bank";
    last4?: string;
    brand?: string;
    expMonth?: number;
    expYear?: number;
    email?: string;
  };
  invoices: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    status: "paid" | "pending" | "failed";
    pdf: string;
  }>;
  usage: {
    emailsSent: number;
    emailsLimit: number;
    contacts: number;
    contactsLimit: number;
  };
}

interface TwoFactorSetup {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export const Settings: React.FC = () => {
  const { showToast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState<Partial<UserProfile>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password state
  const [passwordData, setPasswordData] = useState<PasswordChangeRequest>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Notifications state
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings | null>(null);

  // SMTP state
  const [smtpSettings, setSmtpSettings] = useState<SMTPSettings[]>([]);
  const [selectedSmtp, setSelectedSmtp] = useState<string | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("member");
  const [sendingInvite, setSendingInvite] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [newApiKey, setNewApiKey] = useState<{
    name: string;
    permissions: string[];
  }>({
    name: "",
    permissions: ["read"],
  });
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [showNewApiKey, setShowNewApiKey] = useState<string | null>(null);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  // Billing state
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);

  // 2FA state
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(
    null
  );
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [enabling2FA, setEnabling2FA] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);

  // Appearance state
  const [appearance, setAppearance] = useState({
    theme: profile?.theme || "system",
    density: profile?.density || "comfortable",
    dateFormat: profile?.dateFormat || "MM/DD/YYYY",
    timeFormat: profile?.timeFormat || "12h",
  });

  // Tabs configuration
  const tabs = [
    {
      id: "profile",
      name: "Profile",
      icon: User,
      description: "Manage your personal information",
    },
    {
      id: "account",
      name: "Account Security",
      icon: Shield,
      description: "Password, 2FA, and sessions",
    },
    {
      id: "notifications",
      name: "Notifications",
      icon: Bell,
      description: "Configure alert preferences",
    },
    {
      id: "smtp",
      name: "SMTP Settings",
      icon: Mail,
      description: "Email sending configuration",
    },
    {
      id: "team",
      name: "Team",
      icon: Users,
      description: "Manage team members and permissions",
    },
    {
      id: "api",
      name: "API Keys",
      icon: Key,
      description: "API access and integrations",
    },
    {
      id: "webhooks",
      name: "Webhooks",
      icon: Webhook,
      description: "Real-time event notifications",
    },
    {
      id: "billing",
      name: "Billing",
      icon: CreditCard,
      description: "Subscription and invoices",
    },
    {
      id: "appearance",
      name: "Appearance",
      icon: Palette,
      description: "Customize your interface",
    },
  ];

  // Fetch all settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        profileRes,
        notificationsRes,
        smtpRes,
        teamRes,
        apiKeysRes,
        webhooksRes,
        billingRes,
        sessionsRes,
      ] = await Promise.all([
        api.get<UserProfile>("/settings/profile"),
        api.get<NotificationSettings>("/settings/notifications"),
        api.get<SMTPSettings[]>("/settings/smtp"),
        api.get<TeamMember[]>("/settings/team"),
        api.get<APIKey[]>("/settings/api-keys"),
        api.get<WebhookEndpoint[]>("/settings/webhooks"),
        api.get<BillingInfo>("/settings/billing"),
        api.get<Session[]>("/auth/sessions"),
      ]);

      setProfile(profileRes.data);
      setProfileForm(profileRes.data);
      setNotificationSettings(notificationsRes.data);
      setSmtpSettings(smtpRes.data);
      setTeamMembers(teamRes.data);
      setApiKeys(apiKeysRes.data);
      setWebhooks(webhooksRes.data);
      setBillingInfo(billingRes.data);
      setSessions(sessionsRes.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load settings";
      setError(message);
      showToast(message, "error");
      logError("Settings fetch error", err as Error); // Casting fix
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Password strength calculation
  useEffect(() => {
    if (!passwordData.newPassword) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (passwordData.newPassword.length >= 8) strength += 1;
    if (/[A-Z]/.test(passwordData.newPassword)) strength += 1;
    if (/[a-z]/.test(passwordData.newPassword)) strength += 1;
    if (/[0-9]/.test(passwordData.newPassword)) strength += 1;
    if (/[^A-Za-z0-9]/.test(passwordData.newPassword)) strength += 1;

    setPasswordStrength(strength);
  }, [passwordData.newPassword]);

  // Handle save
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      switch (activeTab) {
        case "profile":
          // Handle avatar upload if needed
          if (avatarFile) {
            const formData = new FormData();
            formData.append("avatar", avatarFile);
            await api.post("/settings/profile/avatar", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          }

          await api.put("/settings/profile", profileForm);
          break;

        case "account":
          if (passwordData.newPassword) {
            if (passwordData.newPassword !== passwordData.confirmPassword) {
              throw new Error("Passwords do not match");
            }
            await api.put("/auth/password", {
              currentPassword: passwordData.currentPassword,
              newPassword: passwordData.newPassword,
            });
            setPasswordData({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
          }
          break;

        case "notifications":
          if (notificationSettings) {
            await api.put("/settings/notifications", notificationSettings);
          }
          break;

        case "appearance":
          await api.put("/settings/appearance", appearance);
          break;
      }

      setSaveSuccess(true);
      showToast("Settings saved successfully", "success");
      trackEvent("settings_saved", { tab: activeTab });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save settings";
      setError(message);
      showToast(message, "error");
      logError("Settings save error", err as Error); // Casting fix
    } finally {
      setSaving(false);
    }
  }, [
    activeTab,
    profileForm,
    avatarFile,
    passwordData,
    notificationSettings,
    appearance,
    showToast,
  ]);

  // Handle avatar change
  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        showToast("Please upload an image file", "error");
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showToast("Image must be less than 2MB", "error");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [showToast]
  );

  // Handle 2FA setup
  const handleSetup2FA = useCallback(async () => {
    try {
      setEnabling2FA(true);
      const response = await api.post<TwoFactorSetup>("/auth/2fa/setup");
      setTwoFactorSetup(response.data);
    } catch (err) {
      showToast("Failed to setup 2FA", "error");
      logError("2FA setup error", err as Error); // Casting fix
    } finally {
      setEnabling2FA(false);
    }
  }, [showToast]);

  // Handle 2FA verify
  const handleVerify2FA = useCallback(async () => {
    try {
      await api.post("/auth/2fa/verify", { code: twoFactorCode });
      showToast("2FA enabled successfully", "success");
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      fetchSettings(); // Refresh profile
    } catch (err) {
      logError("Invalid verification code", err as Error); // Casting fix
      showToast("Invalid verification code", "error");
    }
  }, [twoFactorCode, fetchSettings, showToast]);

  // Handle 2FA disable
  const handleDisable2FA = useCallback(async () => {
    if (
      !window.confirm(
        "Are you sure you want to disable two-factor authentication?"
      )
    )
      return;

    try {
      await api.post("/auth/2fa/disable");
      showToast("2FA disabled", "success");
      fetchSettings(); // Refresh profile
    } catch (err) {
      logError("Failed to diable 2FA", err as Error); // Casting fix
      showToast("Failed to disable 2FA", "error");
    }
  }, [fetchSettings, showToast]);

  // Handle session revocation
  const handleRevokeSession = useCallback(
    async (sessionId: string) => {
      try {
        setRevokingSession(sessionId);
        await api.delete(`/auth/sessions/${sessionId}`);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        showToast("Session revoked", "success");
      } catch (err) {
        logError("Failed to revoke session", err as Error); // Casting fix
        showToast("Failed to revoke session", "error");
      } finally {
        setRevokingSession(null);
      }
    },
    [showToast]
  );

  // Handle logout all devices
  const handleLogoutAll = useCallback(async () => {
    if (
      !window.confirm(
        "This will sign you out from all devices except this one. Continue?"
      )
    )
      return;

    try {
      await api.post("/auth/sessions/revoke-all");
      showToast("All other sessions revoked", "success");
      fetchSettings(); // Refresh sessions
    } catch (err) {
      logError("Failed to revoke sessions", err as Error); // Casting fix
      showToast("Failed to revoke sessions", "error");
    }
  }, [fetchSettings, showToast]);

  // Handle SMTP test
  const handleTestSMTP = useCallback(
    async (id: string) => {
      try {
        setTestingSmtp(true);
        await api.post(`/settings/smtp/${id}/test`);
        showToast("SMTP connection successful", "success");
      } catch (err) {
        logError("SMTP test failed", err as Error); // Casting fix
        showToast("SMTP test failed", "error");
      } finally {
        setTestingSmtp(false);
      }
    },
    [showToast]
  );

  // Handle API key creation
  const handleCreateAPIKey = useCallback(async () => {
    try {
      setCreatingApiKey(true);
      const response = await api.post<APIKey>("/settings/api-keys", newApiKey);
      setApiKeys((prev) => [...prev, response.data]);
      setShowNewApiKey(response.data.key);
      setNewApiKey({ name: "", permissions: ["read"] });
      showToast("API key created", "success");
    } catch (err) {
      logError("Failed to create API key", err as Error); // Casting fix
      showToast("Failed to create API key", "error");
    } finally {
      setCreatingApiKey(false);
    }
  }, [newApiKey, showToast]);

  // Handle API key deletion
  const handleDeleteAPIKey = useCallback(
    async (id: string) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this API key? This action cannot be undone."
        )
      )
        return;

      try {
        await api.delete(`/settings/api-keys/${id}`);
        setApiKeys((prev) => prev.filter((key) => key.id !== id));
        showToast("API key deleted", "success");
      } catch (err) {
        logError("2FA setup error", err as Error); // Casting fix
        showToast("Failed to delete API key", "error");
      }
    },
    [showToast]
  );

  // Handle webhook test
  const handleTestWebhook = useCallback(
    async (id: string) => {
      try {
        setTestingWebhook(id);
        await api.post(`/settings/webhooks/${id}/test`);
        showToast("Webhook test sent", "success");
      } catch (err) {
        logError("2FA setup error", err as Error); // Casting fix
        showToast("Webhook test failed", "error");
      } finally {
        setTestingWebhook(null);
      }
    },
    [showToast]
  );

  // Handle team invitation
  const handleInviteMember = useCallback(async () => {
    if (!validateEmail(inviteEmail)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    try {
      setSendingInvite(true);
      await api.post("/settings/team/invite", {
        email: inviteEmail,
        role: inviteRole,
      });
      showToast("Invitation sent", "success");
      setInviteEmail("");
      fetchSettings(); // Refresh team list
    } catch (err) {
      logError("2FA setup error", err as Error); // Casting fix
      showToast("Failed to send invitation", "error");
    } finally {
      setSendingInvite(false);
    }
  }, [inviteEmail, inviteRole, fetchSettings, showToast]);

  // Handle team member removal
  const handleRemoveMember = useCallback(
    async (id: string) => {
      if (!window.confirm("Are you sure you want to remove this team member?"))
        return;

      try {
        await api.delete(`/settings/team/${id}`);
        setTeamMembers((prev) => prev.filter((m) => m.id !== id));
        showToast("Team member removed", "success");
      } catch (err) {
        logError("2FA setup error", err as Error); // Casting fix
        showToast("Failed to remove team member", "error");
      }
    },
    [showToast]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading settings..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Failed to load settings
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {saveSuccess && (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Settings saved!</span>
            </div>
          )}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Layout */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-12 divide-x divide-gray-200">
          {/* Sidebar */}
          <div className="col-span-3 p-6">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-start space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <tab.icon className="w-5 h-5 flex-shrink-0" />
                  <div className="text-left">
                    <span>{tab.name}</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tab.description}
                    </p>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="col-span-9 p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && profile && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Profile Information
                </h2>

                {/* Avatar */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : profile.avatar ? (
                        <img
                          src={profile.avatar}
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                          {profile.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <Camera className="w-4 h-4 text-gray-600" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Profile Photo
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, GIF or PNG. Max size 2MB.
                    </p>
                    {avatarPreview && (
                      <button
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                        }}
                        className="mt-2 text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Profile Form */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.name || ""}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileForm.email || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {!profile.emailVerified && (
                      <p className="mt-1 text-xs text-yellow-600 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Email not verified
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      value={profileForm.company || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          company: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          phone: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={profileForm.timezone || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          timezone: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={profileForm.language || ""}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          language: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                </div>

                {/* Account Info */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Account Information
                  </h3>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500">Member since</dt>
                      <dd className="font-medium text-gray-900">
                        {formatDate(profile.createdAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Last updated</dt>
                      <dd className="font-medium text-gray-900">
                        {formatDate(profile.updatedAt)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* Account Security Tab */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Account Security
                </h2>

                {/* Password Change */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">
                        Password Security
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Choose a strong password that you don't use elsewhere.
                        We recommend using at least 12 characters with a mix of
                        letters, numbers, and symbols.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            currentPassword: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            current: !prev.current,
                          }))
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.current ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            new: !prev.new,
                          }))
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {passwordData.newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">
                            Password strength:
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              passwordStrength <= 2
                                ? "text-red-500"
                                : passwordStrength === 3
                                ? "text-yellow-500"
                                : "text-green-500"
                            }`}
                          >
                            {passwordStrength <= 2
                              ? "Weak"
                              : passwordStrength === 3
                              ? "Good"
                              : "Strong"}
                          </span>
                        </div>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full ${
                                level <= passwordStrength
                                  ? passwordStrength <= 2
                                    ? "bg-red-500"
                                    : passwordStrength === 3
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            confirm: !prev.confirm,
                          }))
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {passwordData.confirmPassword &&
                      passwordData.newPassword !==
                        passwordData.confirmPassword && (
                        <p className="mt-1 text-xs text-red-600">
                          Passwords do not match
                        </p>
                      )}
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Two-Factor Authentication
                  </h3>

                  {profile?.twoFactorEnabled ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          2FA is currently enabled
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Your account is protected with two-factor
                          authentication
                        </p>
                      </div>
                      <button
                        onClick={handleDisable2FA}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  ) : twoFactorSetup ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          Scan QR Code
                        </h4>
                        <p className="text-sm text-blue-700 mb-4">
                          Scan this QR code with your authenticator app (like
                          Google Authenticator or Authy)
                        </p>
                        <div className="flex justify-center mb-4">
                          <img
                            src={twoFactorSetup.qrCode}
                            alt="2FA QR Code"
                            className="w-48 h-48"
                          />
                        </div>
                        <p className="text-xs text-blue-600 mb-2">
                          Can't scan? Use this secret key:{" "}
                          <code className="bg-blue-100 px-2 py-1 rounded">
                            {twoFactorSetup.secret}
                          </code>
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Verification Code
                        </label>
                        <input
                          type="text"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          maxLength={6}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="000000"
                        />
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={handleVerify2FA}
                          disabled={twoFactorCode.length !== 6}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          Verify & Enable
                        </button>
                        <button
                          onClick={() => setTwoFactorSetup(null)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-yellow-800 mb-2">
                          Backup Codes
                        </h4>
                        <p className="text-xs text-yellow-700 mb-3">
                          Save these backup codes in a secure place. You can use
                          them to access your account if you lose your
                          authenticator device.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {twoFactorSetup.backupCodes.map((code, index) => (
                            <code
                              key={index}
                              className="text-xs bg-yellow-100 px-2 py-1 rounded text-center"
                            >
                              {code}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Add an extra layer of security to your account
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Require a verification code in addition to your
                          password
                        </p>
                      </div>
                      <button
                        onClick={handleSetup2FA}
                        disabled={enabling2FA}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {enabling2FA ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          "Enable 2FA"
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Session Management */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Session Management
                  </h3>

                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {session.device === "mobile" ? (
                            <Smartphone className="w-5 h-5 text-gray-400" />
                          ) : session.device === "tablet" ? (
                            <Tablet className="w-5 h-5 text-gray-400" />
                          ) : (
                            <Laptop className="w-5 h-5 text-gray-400" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {session.browser} on {session.os}
                              {session.current && (
                                <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                  Current
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {session.location} • {session.ip} • Last active{" "}
                              {formatDateTime(session.lastActive)}
                            </p>
                          </div>
                        </div>
                        {!session.current && (
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            disabled={revokingSession === session.id}
                            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {revokingSession === session.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              "Revoke"
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleLogoutAll}
                    className="mt-4 text-sm text-red-600 hover:text-red-700"
                  >
                    Sign out of all devices
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && notificationSettings && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Notification Preferences
                </h2>

                {/* Email Events */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    Email Events
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Email Opens
                        </p>
                        <p className="text-xs text-gray-500">
                          Get notified when someone opens your email
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.email.opens}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email: {
                              ...notificationSettings.email,
                              opens: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Link Clicks
                        </p>
                        <p className="text-xs text-gray-500">
                          Get notified when someone clicks a link
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.email.clicks}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email: {
                              ...notificationSettings.email,
                              clicks: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Unsubscribes
                        </p>
                        <p className="text-xs text-gray-500">
                          Get notified when someone unsubscribes
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.email.unsubscribes}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email: {
                              ...notificationSettings.email,
                              unsubscribes: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Bounces
                        </p>
                        <p className="text-xs text-gray-500">
                          Get notified when emails bounce
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.email.bounces}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email: {
                              ...notificationSettings.email,
                              bounces: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Spam Complaints
                        </p>
                        <p className="text-xs text-gray-500">
                          Get notified when emails are marked as spam
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.email.complaints}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email: {
                              ...notificationSettings.email,
                              complaints: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Campaign Reports */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    Campaign Reports
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Campaign Completed
                        </p>
                        <p className="text-xs text-gray-500">
                          Get notified when a campaign finishes sending
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.email.campaignCompleted}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email: {
                              ...notificationSettings.email,
                              campaignCompleted: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Weekly Performance Report
                        </p>
                        <p className="text-xs text-gray-500">
                          Receive a weekly summary of your campaign performance
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.email.weeklyReport}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email: {
                              ...notificationSettings.email,
                              weeklyReport: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Monthly Performance Report
                        </p>
                        <p className="text-xs text-gray-500">
                          Receive a monthly summary of your campaign performance
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.email.monthlyReport}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email: {
                              ...notificationSettings.email,
                              monthlyReport: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Notification Methods */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    Notification Methods
                  </h3>

                  <div className="space-y-4">
                    {/* Email Method */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            Email
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={true}
                            disabled
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        Email notifications are always enabled for security
                      </p>
                    </div>

                    {/* Browser Method */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            Browser
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.browser.enabled}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                browser: {
                                  ...notificationSettings.browser,
                                  enabled: e.target.checked,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Receive notifications in your browser
                      </p>

                      {notificationSettings.browser.enabled && (
                        <div className="space-y-2 pl-7">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={notificationSettings.browser.opens}
                              onChange={(e) =>
                                setNotificationSettings({
                                  ...notificationSettings,
                                  browser: {
                                    ...notificationSettings.browser,
                                    opens: e.target.checked,
                                  },
                                })
                              }
                              className="w-3 h-3 text-blue-600 rounded"
                            />
                            <span className="text-xs text-gray-600">
                              Email opens
                            </span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={notificationSettings.browser.clicks}
                              onChange={(e) =>
                                setNotificationSettings({
                                  ...notificationSettings,
                                  browser: {
                                    ...notificationSettings.browser,
                                    clicks: e.target.checked,
                                  },
                                })
                              }
                              className="w-3 h-3 text-blue-600 rounded"
                            />
                            <span className="text-xs text-gray-600">
                              Link clicks
                            </span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={
                                notificationSettings.browser.campaignCompleted
                              }
                              onChange={(e) =>
                                setNotificationSettings({
                                  ...notificationSettings,
                                  browser: {
                                    ...notificationSettings.browser,
                                    campaignCompleted: e.target.checked,
                                  },
                                })
                              }
                              className="w-3 h-3 text-blue-600 rounded"
                            />
                            <span className="text-xs text-gray-600">
                              Campaign completed
                            </span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Slack Method */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            Slack
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.slack.enabled}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                slack: {
                                  ...notificationSettings.slack,
                                  enabled: e.target.checked,
                                },
                              })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600"></div>
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                        </label>
                      </div>

                      {notificationSettings.slack.enabled && (
                        <div className="space-y-3 mt-3">
                          <input
                            type="url"
                            placeholder="Slack Webhook URL"
                            value={notificationSettings.slack.webhookUrl}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                slack: {
                                  ...notificationSettings.slack,
                                  webhookUrl: e.target.value,
                                },
                              })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Channel (e.g., #general)"
                            value={notificationSettings.slack.channel}
                            onChange={(e) =>
                              setNotificationSettings({
                                ...notificationSettings,
                                slack: {
                                  ...notificationSettings.slack,
                                  channel: e.target.value,
                                },
                              })
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />

                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-700">
                              Events to notify:
                            </p>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={notificationSettings.slack.opens}
                                onChange={(e) =>
                                  setNotificationSettings({
                                    ...notificationSettings,
                                    slack: {
                                      ...notificationSettings.slack,
                                      opens: e.target.checked,
                                    },
                                  })
                                }
                                className="w-3 h-3 text-blue-600 rounded"
                              />
                              <span className="text-xs text-gray-600">
                                Email opens
                              </span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={notificationSettings.slack.clicks}
                                onChange={(e) =>
                                  setNotificationSettings({
                                    ...notificationSettings,
                                    slack: {
                                      ...notificationSettings.slack,
                                      clicks: e.target.checked,
                                    },
                                  })
                                }
                                className="w-3 h-3 text-blue-600 rounded"
                              />
                              <span className="text-xs text-gray-600">
                                Link clicks
                              </span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={
                                  notificationSettings.slack.unsubscribes
                                }
                                onChange={(e) =>
                                  setNotificationSettings({
                                    ...notificationSettings,
                                    slack: {
                                      ...notificationSettings.slack,
                                      unsubscribes: e.target.checked,
                                    },
                                  })
                                }
                                className="w-3 h-3 text-blue-600 rounded"
                              />
                              <span className="text-xs text-gray-600">
                                Unsubscribes
                              </span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={notificationSettings.slack.bounces}
                                onChange={(e) =>
                                  setNotificationSettings({
                                    ...notificationSettings,
                                    slack: {
                                      ...notificationSettings.slack,
                                      bounces: e.target.checked,
                                    },
                                  })
                                }
                                className="w-3 h-3 text-blue-600 rounded"
                              />
                              <span className="text-xs text-gray-600">
                                Bounces
                              </span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SMTP Settings Tab */}
            {activeTab === "smtp" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    SMTP Settings
                  </h2>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add SMTP Server
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">
                        SMTP Configuration
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        These settings are used to send emails from your
                        campaigns. Make sure to use valid SMTP credentials.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SMTP Servers List */}
                <div className="space-y-4">
                  {smtpSettings.map((smtp) => (
                    <div
                      key={smtp.id}
                      // Added cursor-pointer and an onClick to toggle selection
                      onClick={() =>
                        setSelectedSmtp(
                          selectedSmtp === smtp.id ? null : smtp.id
                        )
                      }
                      className={`border rounded-lg p-4 transition-all cursor-pointer ${
                        selectedSmtp === smtp.id
                          ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50/30"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              smtp.verified ? "bg-green-500" : "bg-yellow-500"
                            }`}
                          />
                          <h4 className="font-medium text-gray-900">
                            {smtp.host}:{smtp.port}
                          </h4>
                          {smtp.isDefault && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                              Default
                            </span>
                          )}
                        </div>

                        {/* Buttons - Added stopPropagation to prevent triggering the card's onClick */}
                        <div
                          className="flex items-center space-x-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleTestSMTP(smtp.id)}
                            disabled={testingSmtp}
                            className="px-3 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            {testingSmtp ? "Testing..." : "Test"}
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Detail view - this now toggles based on your state */}
                      {selectedSmtp === smtp.id && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 animate-in fade-in slide-in-from-top-1">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Host
                            </label>
                            <p className="text-sm font-medium">{smtp.host}</p>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Port
                            </label>
                            <p className="text-sm font-medium">{smtp.port}</p>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Username
                            </label>
                            <p className="text-sm font-medium truncate">
                              {smtp.username}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Encryption
                            </label>
                            <p className="text-sm font-medium capitalize">
                              {smtp.encryption}
                            </p>
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">
                              From Email
                            </label>
                            <p className="text-sm font-medium">
                              {smtp.fromEmail}
                            </p>
                          </div>
                          <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">
                              From Name
                            </label>
                            <p className="text-sm font-medium">
                              {smtp.fromName}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Created
                            </label>
                            <p className="text-sm font-medium">
                              {formatDate(smtp.createdAt)}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Last Updated
                            </label>
                            <p className="text-sm font-medium">
                              {formatDate(smtp.updatedAt)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Tab */}
            {activeTab === "team" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Team Management
                </h2>

                {/* Invite Form */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Invite Team Member
                  </h3>
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <input
                        type="email"
                        placeholder="Email address"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as TeamMember["role"])
                      }
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={handleInviteMember}
                      disabled={sendingInvite || !inviteEmail}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sendingInvite ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        "Send Invite"
                      )}
                    </button>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            member.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {member.email}
                          </p>
                          {member.lastActive && (
                            <p className="text-xs text-gray-400">
                              Last active {formatDateTime(member.lastActive)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600 capitalize">
                          {member.role}
                        </span>
                        <StatusBadge
                          status={member.status}
                          type="contact"
                          size="sm"
                        />
                        {member.role !== "owner" && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Keys Tab */}
            {activeTab === "api" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    API Keys
                  </h2>
                  <button
                    onClick={() => setCreatingApiKey(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Generate New Key
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Key className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">
                        API Keys
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Keep your API keys secure. Do not share them publicly or
                        expose them in client-side code.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Create New Key Form */}
                {creatingApiKey && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">
                      Generate New API Key
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Key Name
                        </label>
                        <input
                          type="text"
                          value={newApiKey.name}
                          onChange={(e) =>
                            setNewApiKey({ ...newApiKey, name: e.target.value })
                          }
                          placeholder="e.g., Production API Key"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Permissions
                        </label>
                        <div className="space-y-2">
                          {["read", "write", "delete", "admin"].map((perm) => (
                            <label
                              key={perm}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                checked={newApiKey.permissions.includes(perm)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewApiKey({
                                      ...newApiKey,
                                      permissions: [
                                        ...newApiKey.permissions,
                                        perm,
                                      ],
                                    });
                                  } else {
                                    setNewApiKey({
                                      ...newApiKey,
                                      permissions: newApiKey.permissions.filter(
                                        (p) => p !== perm
                                      ),
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-700 capitalize">
                                {perm}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={() => setCreatingApiKey(false)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateAPIKey}
                          disabled={!newApiKey.name}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          Generate Key
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Display New API Key */}
                {showNewApiKey && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-green-800">
                          API Key Generated
                        </h4>
                        <p className="text-sm text-green-700 mt-1">
                          Copy this key now. You won't be able to see it again!
                        </p>
                        <div className="mt-3 flex items-center space-x-2">
                          <code className="flex-1 p-2 bg-green-100 rounded text-sm font-mono">
                            {showNewApiKey}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(showNewApiKey);
                              showToast(
                                "API key copied to clipboard",
                                "success"
                              );
                            }}
                            className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                          >
                            <Copy className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowNewApiKey(null)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* API Keys List */}
                <div className="space-y-4">
                  {apiKeys.map((apiKey) => (
                    <div
                      key={apiKey.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {apiKey.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {apiKey.permissions.join(", ")} • Created{" "}
                            {formatDate(apiKey.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="text-sm text-blue-600 hover:text-blue-700">
                            Regenerate
                          </button>
                          <button
                            onClick={() => handleDeleteAPIKey(apiKey.id)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <code className="flex-1 p-2 bg-gray-50 rounded text-sm font-mono">
                          {apiKey.prefix}...{apiKey.lastCharacters}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(apiKey.key);
                            showToast("API key copied to clipboard", "success");
                          }}
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          <Copy className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>
                          Last used:{" "}
                          {apiKey.lastUsed
                            ? formatDateTime(apiKey.lastUsed)
                            : "Never"}
                        </span>
                        {apiKey.expiresAt && (
                          <span>Expires: {formatDate(apiKey.expiresAt)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Webhooks Tab */}
            {activeTab === "webhooks" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Webhook Endpoints
                  </h2>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Endpoint
                  </button>
                </div>

                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <div
                      key={webhook.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              webhook.status === "active"
                                ? "bg-green-500"
                                : webhook.status === "failing"
                                ? "bg-red-500"
                                : "bg-gray-400"
                            }`}
                          />
                          <code className="text-sm font-mono text-gray-900">
                            {webhook.url}
                          </code>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTestWebhook(webhook.id)}
                            disabled={testingWebhook === webhook.id}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            {testingWebhook === webhook.id
                              ? "Testing..."
                              : "Test"}
                          </button>
                          <button className="text-sm text-red-600 hover:text-red-700">
                            Delete
                          </button>
                        </div>
                      </div>

                      {webhook.description && (
                        <p className="text-xs text-gray-500 mt-2">
                          {webhook.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-2 mt-2">
                        {webhook.events.map((event) => (
                          <span
                            key={event}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {event}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                        <span>Created: {formatDate(webhook.createdAt)}</span>
                        {webhook.lastTriggered && (
                          <span>
                            Last triggered:{" "}
                            {formatDateTime(webhook.lastTriggered)}
                          </span>
                        )}
                        {webhook.failureCount > 0 && (
                          <span className="text-red-600">
                            {webhook.failureCount} failures
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && billingInfo && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Billing & Subscription
                </h2>

                {/* Current Plan */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium mb-2">
                        {billingInfo.plan.name} Plan
                      </h3>
                      <p className="text-3xl font-bold mb-4">
                        ${billingInfo.plan.price}/{billingInfo.plan.interval}
                      </p>
                      <StatusBadge
                        status={billingInfo.status}
                        type="campaign"
                        size="sm"
                      />
                    </div>
                    <button className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50">
                      Upgrade Plan
                    </button>
                  </div>
                </div>

                {/* Usage */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500">Emails Sent</p>
                      <span className="text-sm font-medium text-gray-900">
                        {billingInfo.usage.emailsSent.toLocaleString()} /{" "}
                        {billingInfo.usage.emailsLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 rounded-full h-2"
                        style={{
                          width: `${
                            (billingInfo.usage.emailsSent /
                              billingInfo.usage.emailsLimit) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-500">Contacts</p>
                      <span className="text-sm font-medium text-gray-900">
                        {billingInfo.usage.contacts.toLocaleString()} /{" "}
                        {billingInfo.usage.contactsLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 rounded-full h-2"
                        style={{
                          width: `${
                            (billingInfo.usage.contacts /
                              billingInfo.usage.contactsLimit) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Payment Method
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {billingInfo.paymentMethod.type === "card" && (
                        <>
                          <CreditCard className="w-8 h-8 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {billingInfo.paymentMethod.brand} ••••{" "}
                              {billingInfo.paymentMethod.last4}
                            </p>
                            <p className="text-sm text-gray-500">
                              Expires {billingInfo.paymentMethod.expMonth}/
                              {billingInfo.paymentMethod.expYear}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      Update
                    </button>
                  </div>
                </div>

                {/* Next Billing */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">
                      Next Billing Date
                    </p>
                    <p className="font-medium text-gray-900">
                      {formatDate(billingInfo.nextBillingDate)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Amount</p>
                    <p className="font-medium text-gray-900">
                      ${billingInfo.plan.price}
                    </p>
                  </div>
                </div>

                {/* Billing History */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Billing History
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">
                            Date
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">
                            Description
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">
                            Amount
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">
                            Status
                          </th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">
                            Invoice
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {billingInfo.invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(invoice.date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {invoice.description}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              ${invoice.amount}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge
                                status={invoice.status}
                                type="campaign"
                                size="sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <a
                                href={invoice.pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                              >
                                <Download className="w-4 h-4" />
                                <span>PDF</span>
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Appearance Settings
                </h2>

                {/* Theme */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    Theme
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() =>
                        setAppearance({ ...appearance, theme: "light" })
                      }
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        appearance.theme === "light"
                          ? "border-blue-500 bg-blue-50"
                          : "border-transparent hover:border-gray-200"
                      }`}
                    >
                      <div className="w-full h-20 bg-white border border-gray-200 rounded mb-2 flex items-center justify-center">
                        <Sun className="w-8 h-8 text-yellow-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        Light
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        setAppearance({ ...appearance, theme: "dark" })
                      }
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        appearance.theme === "dark"
                          ? "border-blue-500 bg-blue-50"
                          : "border-transparent hover:border-gray-200"
                      }`}
                    >
                      <div className="w-full h-20 bg-gray-900 rounded mb-2 flex items-center justify-center">
                        <Moon className="w-8 h-8 text-gray-300" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        Dark
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        setAppearance({ ...appearance, theme: "system" })
                      }
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        appearance.theme === "system"
                          ? "border-blue-500 bg-blue-50"
                          : "border-transparent hover:border-gray-200"
                      }`}
                    >
                      <div className="w-full h-20 bg-gradient-to-r from-gray-900 to-white rounded mb-2 flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        System
                      </span>
                    </button>
                  </div>
                </div>

                {/* Density */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    Density
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="density"
                        checked={appearance.density === "comfortable"}
                        onChange={() =>
                          setAppearance({
                            ...appearance,
                            density: "comfortable",
                          })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Comfortable
                        </span>
                        <p className="text-xs text-gray-500">
                          More spacing and padding for better readability
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="radio"
                        name="density"
                        checked={appearance.density === "compact"}
                        onChange={() =>
                          setAppearance({ ...appearance, density: "compact" })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Compact
                        </span>
                        <p className="text-xs text-gray-500">
                          Tighter spacing to fit more content
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Date & Time Format */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    Date & Time Format
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Format
                      </label>
                      <select
                        value={appearance.dateFormat}
                        onChange={(e) =>
                          setAppearance({
                            ...appearance,
                            dateFormat: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="MMMM D, YYYY">MMMM D, YYYY</option>
                        <option value="D MMMM YYYY">D MMMM YYYY</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Format
                      </label>
                      <select
                        value={appearance.timeFormat}
                        onChange={(e) =>
                          setAppearance({
                            ...appearance,
                            timeFormat: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      >
                        <option value="12h">12-hour (12:00 PM)</option>
                        <option value="24h">24-hour (14:00)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
