import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ForgotPasswordPage() {
  const { notify } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devTokenNotice, setDevTokenNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      notify(data.message, 'info');
      if (data.dev_reset_token) {
        setDevTokenNotice(data.dev_reset_token);
        setToken(data.dev_reset_token);
      }
      setStep(2);
    } catch (err) {
      notify(err.response?.data?.detail || 'Request failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, newPassword });
      notify(data.message, 'success');
      navigate('/login');
    } catch (err) {
      notify(err.response?.data?.detail || 'Could not reset password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-7">
        <h1 className="text-2xl font-display font-bold text-slate-900">Reset Password</h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {step === 1
            ? 'Enter your account email to generate a reset token.'
            : 'Enter the reset token and choose a new password.'}
        </p>

        {step === 1 ? (
          <form onSubmit={requestReset} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {loading ? 'Generating...' : 'Send Reset Instructions'}
            </button>
          </form>
        ) : (
          <form onSubmit={confirmReset} className="mt-6 space-y-4">
            {devTokenNotice && (
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">Development Mode Reset Token:</p>
                <p className="mt-1 font-mono break-all text-blue-700">{devTokenNotice}</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reset Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-slate-600">
          Remembered your password?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
