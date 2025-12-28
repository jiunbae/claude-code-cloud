'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  SettingsLayout,
  GeneralSettings,
  ApiKeysSettings,
  SkillsSettings,
  AdminSettings,
  type SettingsTab,
} from '@/components/Settings';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />;
      case 'api-keys':
        return <ApiKeysSettings />;
      case 'skills':
        return <SkillsSettings />;
      case 'admin':
        // Only render admin settings if user is admin
        if (user?.role === 'admin') {
          return <AdminSettings />;
        }
        // Fall back to general if somehow navigated here without admin role
        setActiveTab('general');
        return <GeneralSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTabContent()}
    </SettingsLayout>
  );
}
