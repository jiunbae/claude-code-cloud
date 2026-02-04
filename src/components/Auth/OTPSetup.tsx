'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import OTPInput from './OTPInput';

interface OtpSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export default function OTPSetup() {
  const { user, refreshUser } = useAuth();
  const [setupData, setSetupData] = useState<OtpSetupData | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.otpEnabled) {
      setSetupData(null);
      setSetupCode('');
    }
  }, [user?.otpEnabled]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/otp/setup', {
        method: 'POST',
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok) {
        showMessage('error', result.error || 'Failed to start setup');
        return;
      }

      setSetupData(result);
      showMessage('success', 'Scan the QR code and enter your code to enable 2FA');
    } catch (error) {
      console.error('OTP setup error:', error);
      showMessage('error', 'Failed to start setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!setupCode) {
      showMessage('error', 'Enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: setupCode }),
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok) {
        showMessage('error', result.error || 'Failed to verify code');
        return;
      }

      await refreshUser();
      setSetupData(null);
      setSetupCode('');
      showMessage('success', 'Two-factor authentication enabled');
    } catch (error) {
      console.error('OTP verify error:', error);
      showMessage('error', 'Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword || !disableCode) {
      showMessage('error', 'Password and code are required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/otp/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok) {
        showMessage('error', result.error || 'Failed to disable 2FA');
        return;
      }

      await refreshUser();
      setDisablePassword('');
      setDisableCode('');
      showMessage('success', 'Two-factor authentication disabled');
    } catch (error) {
      console.error('OTP disable error:', error);
      showMessage('error', 'Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-white">Two-factor authentication</h3>
          <p className="text-gray-400 text-sm">Protect your account with an extra verification step</p>
        </div>
        <span
          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
            user.otpEnabled
              ? 'bg-green-500/10 text-green-300 border border-green-500/30'
              : 'bg-gray-700 text-gray-300 border border-gray-600'
          }`}
        >
          {user.otpEnabled ? 'Enabled' : 'Not enabled'}
        </span>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-900/40 border border-green-700 text-green-300'
              : 'bg-red-900/40 border border-red-700 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {user.otpEnabled ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            To disable two-factor authentication, confirm your password and a valid OTP code.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Current password</label>
              <input
                type="password"
                value={disablePassword}
                onChange={(event) => setDisablePassword(event.target.value)}
                className="w-full max-w-sm px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Authentication code</label>
              <OTPInput value={disableCode} onChange={setDisableCode} />
            </div>
          </div>
          <button
            type="button"
            onClick={handleDisable}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-red-300 border border-red-500/40 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {!setupData ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-400">Set up an authenticator app for stronger login security.</p>
              <button
                type="button"
                onClick={handleSetup}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Starting...' : 'Set up 2FA'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-4">
                <div className="bg-white p-3 rounded-lg">
                  <img src={setupData.qrCodeUrl} alt="OTP QR code" className="w-full h-auto" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">Scan this QR code with your authenticator app.</p>
                  <p className="text-xs text-gray-500">
                    If you cannot scan, enter this secret manually:
                  </p>
                  <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 font-mono">
                    {setupData.secret}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white">Backup codes</h4>
                <p className="text-xs text-gray-500">
                  Save these codes in a secure place. Each code can be used once if you lose access to your app.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {setupData.backupCodes.map((code) => (
                    <span
                      key={code}
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 font-mono text-center"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">Enter code to enable</label>
                <OTPInput value={setupCode} onChange={setSetupCode} />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Enable'}
                </button>
                <button
                  type="button"
                  onClick={() => setSetupData(null)}
                  className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel setup
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
