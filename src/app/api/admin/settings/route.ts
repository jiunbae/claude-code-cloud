import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/server/auth';
import { globalSettingsStore } from '@/server/settings';
import type { GlobalSettings } from '@/types/settings';
import { VALID_API_PROVIDERS } from '@/types/settings';

// GET /api/admin/settings - Get global settings (admin only)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (isErrorResponse(auth)) {
    return auth;
  }

  try {
    const settings = globalSettingsStore.getAll();
    const lastUpdated = globalSettingsStore.getLastUpdated();

    return NextResponse.json({
      settings,
      lastUpdated,
    });
  } catch (error) {
    console.error('Failed to get global settings:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update global settings (admin only)
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (isErrorResponse(auth)) {
    return auth;
  }

  try {
    const body = await request.json();
    const updates: Partial<GlobalSettings> = {};

    // Validate and extract allowed fields
    if (body.allowRegistration !== undefined) {
      updates.allowRegistration = Boolean(body.allowRegistration);
    }

    if (body.requireEmailVerification !== undefined) {
      updates.requireEmailVerification = Boolean(body.requireEmailVerification);
    }

    if (body.maxUsersAllowed !== undefined) {
      const max = Number(body.maxUsersAllowed);
      if (isNaN(max) || max < 1 || max > 10000) {
        return NextResponse.json(
          { error: 'maxUsersAllowed must be between 1 and 10000', field: 'maxUsersAllowed' },
          { status: 400 }
        );
      }
      updates.maxUsersAllowed = max;
    }

    if (body.defaultApiProvider !== undefined) {
      if (!VALID_API_PROVIDERS.includes(body.defaultApiProvider)) {
        return NextResponse.json(
          { error: 'Invalid API provider', field: 'defaultApiProvider' },
          { status: 400 }
        );
      }
      updates.defaultApiProvider = body.defaultApiProvider;
    }

    if (body.allowUserApiKeys !== undefined) {
      updates.allowUserApiKeys = Boolean(body.allowUserApiKeys);
    }

    if (body.requireApiKey !== undefined) {
      updates.requireApiKey = Boolean(body.requireApiKey);
    }

    if (body.maxSessionsPerUser !== undefined) {
      const max = Number(body.maxSessionsPerUser);
      if (isNaN(max) || max < 1 || max > 100) {
        return NextResponse.json(
          { error: 'maxSessionsPerUser must be between 1 and 100', field: 'maxSessionsPerUser' },
          { status: 400 }
        );
      }
      updates.maxSessionsPerUser = max;
    }

    if (body.sessionTimeoutMinutes !== undefined) {
      const timeout = Number(body.sessionTimeoutMinutes);
      if (isNaN(timeout) || timeout < 5 || timeout > 1440) {
        return NextResponse.json(
          { error: 'sessionTimeoutMinutes must be between 5 and 1440', field: 'sessionTimeoutMinutes' },
          { status: 400 }
        );
      }
      updates.sessionTimeoutMinutes = timeout;
    }

    if (body.skillsEnabled !== undefined) {
      updates.skillsEnabled = Boolean(body.skillsEnabled);
    }

    if (body.allowUserSkillInstall !== undefined) {
      updates.allowUserSkillInstall = Boolean(body.allowUserSkillInstall);
    }

    if (body.customBranding !== undefined) {
      // Validate custom branding object
      if (typeof body.customBranding !== 'object' || body.customBranding === null) {
        return NextResponse.json(
          { error: 'Invalid customBranding format', field: 'customBranding' },
          { status: 400 }
        );
      }
      // Validate and extract only string properties
      updates.customBranding = {};
      if (typeof body.customBranding.appName === 'string') {
        updates.customBranding.appName = body.customBranding.appName;
      }
      if (typeof body.customBranding.logoUrl === 'string') {
        updates.customBranding.logoUrl = body.customBranding.logoUrl;
      }
      if (typeof body.customBranding.primaryColor === 'string') {
        updates.customBranding.primaryColor = body.customBranding.primaryColor;
      }
    }

    const settings = globalSettingsStore.updateMany(updates, auth.userId);
    const lastUpdated = globalSettingsStore.getLastUpdated();

    return NextResponse.json({
      settings,
      lastUpdated,
      message: 'Settings updated',
    });
  } catch (error) {
    console.error('Failed to update global settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
