import { useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { INDIAN_CITIES } from '../../utils/format';

export default function ContactPage() {
  const { notify } = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    city: 'Bengaluru',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/contact', form);
      notify(data.message, 'success');
      setSubmitted(true);
      setForm({ name: '', email: '', city: 'Bengaluru', subject: '', message: '' });
    } catch (err) {
      notify(err.response?.data?.detail || 'Could not send inquiry.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <h1 className="text-3xl font-display font-bold text-slate-900">Contact AutoCollective</h1>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Questions about forming a corporate or residential collective, dealership onboarding, or quotation verification? Reach our advisory desk.
          </p>
          <div className="mt-8 space-y-4 text-sm text-slate-700 border-t border-slate-200 pt-6">
            <div>
              <span className="text-xs text-slate-500 block">Advisory Desk</span>
              <span className="font-medium">support@autocollective.in</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Dealer Onboarding</span>
              <span className="font-medium">partners@autocollective.in</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Headquarters</span>
              <span>Indiranagar 100ft Road, Bengaluru 560038, India</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          {submitted ? (
            <div className="bg-white border border-emerald-200 rounded-lg p-8">
              <h2 className="text-lg font-display font-semibold text-slate-900">Inquiry Logged</h2>
              <p className="mt-2 text-sm text-slate-600">
                Your message has been saved to our support queue. Our city coordinator will follow up by email.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    {INDIAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit Inquiry'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
