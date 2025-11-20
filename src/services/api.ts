/**
 * API Service for communicating with FastAPI backend
 * Security: Token management, error handling, request interceptors
 */

// Production API URL - points to VM
const API_BASE_URL = "http://10.0.2.2:8000"

// Security: Token storage (in production, use secure storage like Keychain/Keystore)
let authToken: string | null = null;
let currentUser: { user_id: number; username: string } | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  // Security: Store token securely (implement secure storage)
  if (token) {
    // TODO: Store in secure storage (e.g., Keychain on iOS, Keystore on Android)
  } else {
    // TODO: Remove from secure storage
  }
};

export const getAuthToken = (): string | null => {
  return authToken;
};

export const setCurrentUser = (user: { user_id: number; username: string } | null) => {
  currentUser = user;
};

export const getCurrentUser = (): { user_id: number; username: string } | null => {
  return currentUser;
};

// Security: API request helper with authentication
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  // Security: Add authentication token if available
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Security: Handle different response statuses
    const contentType = response.headers.get("content-type") || "";
    const hasBody =
      response.status !== 204 &&
      response.status !== 205 &&
      response.headers.get("content-length") !== "0";

    if (!response.ok) {
      const errorText = hasBody ? await response.text() : "";
      let errorData: any = {};

      if (errorText) {
        if (contentType.includes("application/json")) {
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { detail: errorText };
          }
        } else {
          errorData = { detail: errorText };
        }
      }

      throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
    }

    if (!hasBody) {
      return null;
    }

    if (contentType.includes("application/json")) {
      const text = await response.text();
      if (!text.trim()) {
        return null;
      }
      try {
        return JSON.parse(text);
      } catch {
        if (__DEV__) {
          console.log(`[API] ${endpoint} returned invalid JSON payload`);
        }
        return null;
      }
    }
    
    return null;
  } catch (error: any) {
    // Extract user-friendly error message, removing any technical prefixes
    let errorMessage = "An error occurred";
    
    // Extract message from error object
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error?.message && typeof error.message === "string") {
      errorMessage = error.message;
    } else if (error?.detail && typeof error.detail === "string") {
      errorMessage = error.detail;
    } else if (error?.error && typeof error.error === "string") {
      errorMessage = error.error;
    }
    
    // Clean up the error message - remove technical prefixes and ensure it's just a string
    errorMessage = String(errorMessage || "").replace(/^API Error \[.*?\]:\s*/i, "");
    errorMessage = errorMessage.replace(/^Error:\s*/i, "");
    errorMessage = errorMessage.trim() || "An error occurred";
    
    // Log for debugging (using console.log to avoid triggering error overlays)
    if (__DEV__) {
      console.log(`[API] ${endpoint} error: ${errorMessage}`);
    }
    
    // Create a new error with just the clean message string (no object details)
    const cleanError = new Error(errorMessage);
    // Ensure error object doesn't contain any extra properties
    Object.setPrototypeOf(cleanError, Error.prototype);
    throw cleanError;
  }
};

// Authentication API
export const authAPI = {
  login: async (username: string, password: string) => {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (data.access_token) {
      setAuthToken(data.access_token);
      if (data.user_id && data.username) {
        setCurrentUser({ user_id: data.user_id, username: data.username });
      }
    }
    return data;
  },

  signup: async (
    username: string,
    password: string,
    confirmPassword: string,
    questionId: number,
    answer: string
  ) => {
    const data = await apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        confirm_password: confirmPassword,
        question_id: questionId,
        answer,
      }),
    });
    if (data.access_token) {
      setAuthToken(data.access_token);
      if (data.user_id && data.username) {
        setCurrentUser({ user_id: data.user_id, username: data.username });
      }
    }
    return data;
  },

  getSecurityQuestions: async () => {
    return apiRequest("/api/auth/questions", {
      method: "GET",
    });
  },

  forgotPassword: async (username: string, questionId: number, answer: string) => {
    return apiRequest("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({
        username,
        question_id: questionId,
        answer,
      }),
    });
  },

  resetPassword: async (
    userId: number,
    newPassword: string,
    currentPassword?: string,
    questionId?: number,
    answer?: string
  ) => {
    return apiRequest("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        new_password: newPassword,
        current_password: currentPassword,
        question_id: questionId,
        answer,
      }),
    });
  },
};

// Passwords API
export const passwordsAPI = {
  getAll: async (skip: number = 0, limit: number = 100, applicationName?: string) => {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    if (applicationName) {
      params.append("application_name", applicationName);
    }
    return apiRequest(`/api/passwords?${params.toString()}`, {
      method: "GET",
    });
  },

  getRecent: async (limit: number = 10) => {
    return apiRequest(`/api/passwords/recent?limit=${limit}`, {
      method: "GET",
    });
  },

  getById: async (passwordId: number) => {
    return apiRequest(`/api/passwords/${passwordId}`, {
      method: "GET",
    });
  },

  create: async (
    applicationName: string,
    accountUserName: string,
    applicationPassword: string,
    applicationType?: string
  ) => {
    return apiRequest("/api/passwords", {
      method: "POST",
      body: JSON.stringify({
        application_name: applicationName,
        account_user_name: accountUserName,
        application_password: applicationPassword,
        application_type: applicationType || null,
      }),
    });
  },

  update: async (
    passwordId: number,
    applicationPassword: string,
    applicationName?: string,
    accountUserName?: string
  ) => {
    return apiRequest(`/api/passwords/${passwordId}`, {
      method: "PUT",
      body: JSON.stringify({
        application_password: applicationPassword,
        application_name: applicationName,
        account_user_name: accountUserName,
      }),
    });
  },

  delete: async (passwordId: number) => {
    return apiRequest(`/api/passwords/${passwordId}`, {
      method: "DELETE",
    });
  },

  getApplications: async () => {
    return apiRequest("/api/passwords/applications/list", {
      method: "GET",
    });
  },

  getByApplication: async (applicationName: string) => {
    return apiRequest(`/api/passwords/applications/${encodeURIComponent(applicationName)}`, {
      method: "GET",
    });
  },

  getApplicationTypes: async () => {
    return apiRequest("/api/passwords/application-types/list", {
      method: "GET",
    });
  },

  getByApplicationType: async (applicationType: string) => {
    const params = new URLSearchParams({
      application_type: applicationType,
    });
    return apiRequest(`/api/passwords?${params.toString()}`, {
      method: "GET",
    });
  },
};

// Groups API
export const groupsAPI = {
  getAll: async () => {
    return apiRequest("/api/groups", {
      method: "GET",
    });
  },
  listSummaries: async () => {
    return apiRequest("/api/groups/list", {
      method: "GET",
    });
  },
  create: async (groupName: string) => {
    return apiRequest("/api/groups/create", {
      method: "POST",
      body: JSON.stringify({ group_name: groupName }),
    });
  },

  deleteGroup: async (groupName: string) => {
    return apiRequest(`/api/groups/${encodeURIComponent(groupName)}`, {
      method: "DELETE",
    });
  },

  getMembers: async (groupName: string) => {
    return apiRequest(`/api/groups/${encodeURIComponent(groupName)}/members`, {
      method: "GET",
    });
  },
  removeMember: async (groupName: string, userId: number) => {
    return apiRequest(`/api/groups/${encodeURIComponent(groupName)}/members/${userId}`, {
      method: "DELETE",
    });
  },

  sharePassword: async (groupName: string, passwordId: number, userIds: number[]) => {
    return apiRequest("/api/groups/share", {
      method: "POST",
      body: JSON.stringify({
        group_name: groupName,
        password_id: passwordId,
        user_ids: userIds,
      }),
    });
  },
  shareAll: async (groupName: string, passwordId: number) => {
    return apiRequest("/api/groups/share-all", {
      method: "POST",
      body: JSON.stringify({
        group_name: groupName,
        password_id: passwordId,
      }),
    });
  },

  unsharePassword: async (groupName: string, passwordId: number, userIds: number[]) => {
    return apiRequest("/api/groups/unshare", {
      method: "POST",
      body: JSON.stringify({
        group_name: groupName,
        password_id: passwordId,
        user_ids: userIds,
      }),
    });
  },

  getSharedPasswords: async () => {
    return apiRequest("/api/groups/shared/passwords", {
      method: "GET",
    });
  },
  getGroupSharedPasswords: async (groupName: string) => {
    return apiRequest(`/api/groups/${encodeURIComponent(groupName)}/shared/passwords`, {
      method: "GET",
    });
  },
};

// Security API
export const securityAPI = {
  analyzePasswords: async () => {
    return apiRequest("/api/security/analysis", {
      method: "GET",
    });
  },

  getStats: async () => {
    return apiRequest("/api/security/stats", {
      method: "GET",
    });
  },
};

// FAQs API
export const faqsAPI = {
  getAll: async () => {
    return apiRequest("/api/faqs", {
      method: "GET",
    });
  },

  getById: async (faqId: number) => {
    return apiRequest(`/api/faqs/${faqId}`, {
      method: "GET",
    });
  },
};

// Messages API
export const messagesAPI = {
  getAll: async () => {
    return apiRequest("/api/messages", {
      method: "GET",
    });
  },

  createTrustedUserRequest: async (targetUsername: string) => {
    return apiRequest("/api/messages/trusted-user-request", {
      method: "POST",
      body: JSON.stringify({ target_username: targetUsername }),
    });
  },

  createGroupInvitation: async (targetUsername: string, groupName: string) => {
    return apiRequest("/api/messages/group-invitation", {
      method: "POST",
      body: JSON.stringify({
        target_username: targetUsername,
        group_name: groupName,
      }),
    });
  },

  accept: async (messageId: string) => {
    return apiRequest(`/api/messages/${messageId}/accept`, {
      method: "POST",
    });
  },

  reject: async (messageId: string) => {
    return apiRequest(`/api/messages/${messageId}/reject`, {
      method: "POST",
    });
  },

  getCount: async () => {
    return apiRequest("/api/messages/count", {
      method: "GET",
    });
  },
};

// Users API
export const usersAPI = {
  search: async (query: string, limit: number = 10) => {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
    });
    return apiRequest(`/api/users/search?${params.toString()}`, {
      method: "GET",
    });
  },
};

// Health check
export const healthCheck = async () => {
  return apiRequest("/health", {
    method: "GET",
  });
};

