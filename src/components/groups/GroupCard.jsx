import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { formatDate, formatLakhs } from '../../utils/format';

export default function GroupCard({ group, onJoin, onLeave, actionLoading }) {
  const pct = Math.min(100, Math.round((group.current_members / Math.max(1, group.target_members)) * 100));
  const remaining = Math.max(0, group.target_members - group.current_members);

  const statusColor =
    group.status === 'Offer Received' || group.status === 'Deal Completed'
      ? 'text-emerald-700'
      : group.status === 'Ready for Negotiation' || group.status === 'Negotiating'
        ? 'text-blue-700'
        : group.status === 'Expired'
          ? 'text-red-700'
          : 'text-slate-700';

  const canJoin =
    !group.is_member &&
    group.current_members < group.target_members &&
    !['Deal Completed', 'Expired'].includes(group.status);

  return (
    <article className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-mono text-slate-500">{group.city}</span>
          <span className={`font-medium ${statusColor}`}>{group.status}</span>
        </div>

        <h3 className="mt-2 text-base font-display font-semibold text-slate-900">
          {group.brand} {group.model} {group.variant}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {group.fuel_type} · {group.transmission} · {group.timeline}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-700 font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {group.current_members} of {group.target_members} buyers joined
              </span>
            </span>
            <span className="font-mono text-slate-500 tabular-nums">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all ${pct >= 100 ? 'bg-emerald-600' : 'bg-blue-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {remaining > 0 ? `${remaining} more buyer${remaining > 1 ? 's' : ''} needed!` : 'Group target reached — ready for dealer offers.'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>
            Budget: <strong className="font-mono font-medium text-slate-900">{formatLakhs(group.min_budget)} – {formatLakhs(group.max_budget)}</strong>
          </span>
          <span>{formatDate(group.created_at)}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Link
          to={`/groups/${group.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
        >
          <span>View Group</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {group.is_member && onLeave ? (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onLeave(group.id)}
            className="px-3 py-2 text-xs font-medium text-red-700 border border-red-200 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            Leave Group
          </button>
        ) : (
          onJoin &&
          canJoin && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => onJoin(group.id)}
              className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              Join Group
            </button>
          )
        )}
      </div>
    </article>
  );
}
