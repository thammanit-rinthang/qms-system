import { requireAuth } from "@/lib/auth";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { SignatureType } from "@/generated/prisma/client";
import {
  getAuthCenterMe,
  getAuthCenterUserProfile,
  updateAuthCenterProfile,
  updateAuthCenterUserProfileM2M,
} from "@/lib/auth-center-admin-client";
import { getUserSnapshot } from "@/lib/userSnapshotCache";

const userPrefRepo = new UserPreferenceRepository();

export async function GET() {
  try {
    const session = await requireAuth();
    const authUserId = session.user.authUserId ?? session.user.id;

    // Prefer the user's own Auth Center token; fallback to app-admin proxy only if absent.
    const [acProfile, userPref, snapshot] = await Promise.all([
      authUserId
        ? (session.user.accessToken
            ? getAuthCenterMe(session.user.accessToken)
            : getAuthCenterUserProfile(authUserId))
        : Promise.resolve(null),
      session.user.id
        ? userPrefRepo.findByAuthUserId(session.user.id)
        : Promise.resolve(null),
      getUserSnapshot(session.user.id),
    ]);

    return sendSuccess({
      id: session.user.id,
      authUserId,
      name: acProfile?.displayName ?? snapshot?.name ?? null,
      email: acProfile?.email ?? snapshot?.email ?? null,
      employeeId: acProfile?.employeeId ?? snapshot?.employeeId ?? null,
      position: acProfile?.jobTitle ?? null,
      department: acProfile?.department ?? snapshot?.departmentName ?? null,
      authDepartmentId: session.user.authDepartmentId ?? null,
      officeLocation: acProfile?.officeLocation ?? null,
      mobilePhone: acProfile?.mobilePhone ?? null,
      savedSignatureUrl: userPref?.savedSignatureUrl ?? null,
      signatureType: userPref?.signatureType ?? null,
      image: null,
      role: session.user.role,
      source: "auth_center",
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  // Identity fields (proxied to Auth Center via M2M)
  name: z.string().min(1).max(255).optional(),
  employeeId: z.string().max(16).optional().nullable(),
  department: z.string().max(200).optional().nullable(),
  position: z.string().max(255).optional().nullable(),
  officeLocation: z.string().max(200).optional().nullable(),
  mobilePhone: z.string().max(50).optional().nullable(),
  // QMS-local fields (always written locally to UserPreference)
  savedSignatureUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Invalid signature format")
    .max(524288)
    .optional()
    .nullable(),
  signatureType: z.enum(["DRAW", "TYPE", "IMAGE"]).optional().nullable(),
  clearSignature: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const authUserId = session.user.authUserId ?? session.user.id;
    const body = await req.json();
    const parsed = patchSchema.parse(body);

    if (authUserId) {
      const acFields = {
        ...(parsed.name !== undefined ? { displayName: parsed.name } : {}),
        ...(parsed.department !== undefined ? { department: parsed.department ?? undefined } : {}),
        ...(parsed.position !== undefined ? { jobTitle: parsed.position ?? undefined } : {}),
        ...(parsed.officeLocation !== undefined ? { officeLocation: parsed.officeLocation ?? undefined } : {}),
        ...(parsed.mobilePhone !== undefined ? { mobilePhone: parsed.mobilePhone ?? undefined } : {}),
      };

      if (Object.keys(acFields).length > 0) {
        if (session.user.accessToken) {
          await updateAuthCenterProfile(session.user.accessToken, acFields);
        } else {
          await updateAuthCenterUserProfileM2M(authUserId, {
            displayName: acFields.displayName,
            // department self-update requires delegated user token on Auth Center; M2M path does not support it.
            jobTitle: acFields.jobTitle ?? null,
            officeLocation: acFields.officeLocation ?? null,
            mobilePhone: acFields.mobilePhone ?? null,
          });
        }
      }
    }

    // Write signature to UserPreference table
    let savedSignatureUrl: string | null = null;
    let signatureType: SignatureType | null = null;

    if (parsed.clearSignature) {
      await userPrefRepo.clearSignature(session.user.id);
    } else if (parsed.savedSignatureUrl !== undefined) {
      const sigUrl = parsed.savedSignatureUrl ?? null;
      const sigType = (parsed.signatureType ?? null) as SignatureType | null;
      if (sigUrl && sigType) {
        await userPrefRepo.upsertSignature(session.user.id, {
          savedSignatureUrl: sigUrl,
          signatureType: sigType,
        });
        savedSignatureUrl = sigUrl;
        signatureType = sigType;
      } else if (sigUrl === null) {
        await userPrefRepo.clearSignature(session.user.id);
      }
    } else {
      // No signature change — read current value to return in response
      const currentPref = await userPrefRepo.findByAuthUserId(session.user.id);
      savedSignatureUrl = currentPref?.savedSignatureUrl ?? null;
      signatureType = (currentPref?.signatureType ?? null) as SignatureType | null;
    }

    // Re-read profile from Auth Center to get updated name etc.
    const updatedProfile = authUserId
      ? await getAuthCenterUserProfile(authUserId).catch(() => null)
      : null;

    return sendSuccess({
      id: session.user.id,
      name: updatedProfile?.displayName ?? parsed.name ?? null,
      email: updatedProfile?.email ?? session.user.email ?? null,
      employeeId: updatedProfile?.employeeId ?? null,
      position: updatedProfile?.jobTitle ?? parsed.position ?? null,
      savedSignatureUrl,
      signatureType,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
