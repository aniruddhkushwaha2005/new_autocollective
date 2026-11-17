import { Link } from 'react-router-dom';
import { Bookmark, ArrowRight } from 'lucide-react';
import CarImage from '../common/CarImage';
import { formatLakhs } from '../../utils/format';

export default function CarCard({ car, isSaved, onToggleSave, onRequestCar }) {
  return (
    <article className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col hover:border-slate-300 transition-colors">
      <div className="relative bg-slate-100 aspect-[4/3] overflow-hidden">
        <CarImage
          src={car.image_url}
          alt={`${car.brand} ${car.model} ${car.variant}`}
          className="w-full h-full object-cover"
        />
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(car.id)}
            aria-label={isSaved ? 'Remove from saved cars' : 'Save car'}
            className={`absolute top-3 right-3 p-2 rounded-md border transition-colors ${
              isSaved
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-white'
            }`}
          >
            <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <p className="text-xs text-slate-500">
          {car.brand} · {car.segment}
        </p>
        <h3 className="mt-1 text-base font-display font-semibold text-slate-900">
          {car.model} {car.variant}
        </h3>
        <p className="mt-1.5 text-xs text-slate-500">
          {car.fuel_type} · {car.transmission} · {car.mileage}
        </p>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between gap-2">
          <div>
            <span className="text-xs text-slate-500 block">Ex-Showroom</span>
            <span className="text-base font-mono font-semibold text-slate-900 tabular-nums">
              {formatLakhs(car.ex_showroom_price)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Active Groups</span>
            <span className="text-sm font-mono font-medium text-blue-600 tabular-nums">
              {car.active_groups_count || 0} open
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            to={`/groups?brand=${encodeURIComponent(car.brand)}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <span>View Groups</span>
          </Link>
          {onRequestCar ? (
            <button
              type="button"
              onClick={() => onRequestCar(car)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <span>Join / Request</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              to={`/dashboard?requestCar=${car.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <span>Request Deal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
