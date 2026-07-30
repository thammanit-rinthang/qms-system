export type EmailSendReadiness = {
  ready: boolean;
  mode: "delegated" | "m2m" | "unavailable";
  skipReason: string | null;
};

export function getEmailSendReadiness(input: {
  authCenterUrl?: string | null;
  hasSessionToken: boolean;
  hasM2mCredentials: boolean;
}): EmailSendReadiness {
  if (!input.authCenterUrl?.trim()) {
    return {
      ready: false,
      mode: "unavailable",
      skipReason: "AUTH_CENTER_URL or mail credentials are missing",
    };
  }

  if (input.hasSessionToken) {
    return { ready: true, mode: "delegated", skipReason: null };
  }

  if (input.hasM2mCredentials) {
    return { ready: true, mode: "m2m", skipReason: null };
  }

  return {
    ready: false,
    mode: "unavailable",
    skipReason: "AUTH_CENTER_URL or mail credentials are missing",
  };
}
