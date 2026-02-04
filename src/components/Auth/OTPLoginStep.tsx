'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import OTPInput from './OTPInput';

interface OTPLoginStepProps {
  tempToken: string;
  email?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function OTPLoginStep({ tempToken, email, onSuccess, onCancel }: OTPLoginStepProps) {
  const { verifyOtpLogin } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!code) {
      setError('Enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyOtpLogin(code, tempToken);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Invalid code');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">Two-factor authentication</h2>
        <p className="text-gray-400 text-sm">
          Enter the 6-digit code from your authenticator app{email ? ` for ${email}` : ''}.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">Authentication code</label>
        <OTPInput value={code} onChange={setCode} autoFocus />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading}
          className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
        >
          {loading ? 'Verifying...' : 'Verify & Sign In'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-gray-400 hover:text-white transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}
