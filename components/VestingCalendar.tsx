import React, { useMemo, useState } from 'react';
import { Client, AggregatedVestingEvent } from '../types';
import { generateVestingSchedule, formatCurrency, formatNumber, generateICSFileContent } from '../utils/calculations';
import { Calendar, Download, Search, TrendingUp, CalendarDays } from 'lucide-react';
import { Button } from './Button';

interface VestingCalendarProps {
  clients: Client[];
}

export const VestingCalendar: React.FC<VestingCalendarProps> = ({ clients }) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [timeframe, setTimeframe] = useState<'all' | '30' | '90'>('all');

  const upcomingEvents = useMemo(() => {
    let allEvents: AggregatedVestingEvent[] = [];
    const now = new Date();
    // Normalize today to start of day
    now.setHours(0,0,0,0);

    clients.forEach(client => {
      client.grants.forEach(grant => {
        const schedule = generateVestingSchedule(grant, client);
        const futureEvents = schedule.filter(e => new Date(e.date) >= now).map(e => ({
          ...e,
          clientId: client.id,
          clientName: client.name,
          grantTicker: grant.ticker,
          companyName: grant.companyName
        }));
        allEvents = [...allEvents, ...futureEvents];
      });
    });

    return allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [clients]);

  const filteredEvents = useMemo(() => {
    let events = upcomingEvents;
    
    // Timeframe Filter
    const now = new Date();
    if (timeframe === '30') {
      const limit = new Date(now);
      limit.setDate(limit.getDate() + 30);
      events = events.filter(e => new Date(e.date) <= limit);
    } else if (timeframe === '90') {
      const limit = new Date(now);
      limit.setDate(limit.getDate() + 90);
      events = events.filter(e => new Date(e.date) <= limit);
    }

    // Search Filter
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      events = events.filter(e => 
        e.clientName.toLowerCase().includes(q) || 
        e.grantTicker.toLowerCase().includes(q)
      );
    }

    return events;
  }, [upcomingEvents, filterQuery, timeframe]);

  // Aggregated Stats
  const stats = useMemo(() => {
    const next30 = new Date();
    next30.setDate(next30.getDate() + 30);
    
    const next90 = new Date();
    next90.setDate(next90.getDate() + 90);

    const vol30 = upcomingEvents.filter(e => new Date(e.date) <= next30).reduce((sum, e) => sum + e.grossValue, 0);
    const vol90 = upcomingEvents.filter(e => new Date(e.date) <= next90).reduce((sum, e) => sum + e.grossValue, 0);

    return { vol30, vol90 };
  }, [upcomingEvents]);

  const handleDownloadICS = (event: AggregatedVestingEvent) => {
    const content = generateICSFileContent(event);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vesting_${event.grantTicker}_${event.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-tidemark-navy flex items-center gap-2">
             <CalendarDays className="text-tidemark-blue" />
             Vesting Calendar Hub
           </h1>
           <p className="text-slate-500">Centralized schedule of upcoming equity events across all clients.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <TrendingUp size={24} />
             </div>
             <div>
                <p className="text-xs font-bold text-slate-500 uppercase">30-Day Liquidity Volume</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.vol30)}</p>
             </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Calendar size={24} />
             </div>
             <div>
                <p className="text-xs font-bold text-slate-500 uppercase">90-Day Liquidity Volume</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.vol90)}</p>
             </div>
          </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by client or ticker..." 
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tidemark-blue outline-none text-sm"
            />
         </div>
         <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeframe === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All Upcoming
            </button>
            <button 
              onClick={() => setTimeframe('90')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeframe === '90' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Next 90 Days
            </button>
            <button 
              onClick={() => setTimeframe('30')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeframe === '30' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Next 30 Days
            </button>
         </div>
      </div>

      {/* Event List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Vesting Date</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Grant / Ticker</th>
                    <th className="px-6 py-4 text-right">Shares</th>
                    <th className="px-6 py-4 text-right">Est. Value</th>
                    <th className="px-6 py-4 text-right">Reminder</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredEvents.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          No vesting events found matching your filters.
                       </td>
                    </tr>
                 ) : (
                    filteredEvents.map((event, idx) => (
                      <tr key={`${event.clientId}-${event.grantTicker}-${event.date}-${idx}`} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900">
                           <div className="flex items-center gap-2">
                              <Calendar size={16} className="text-slate-400" />
                              {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                           </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-tidemark-navy">
                           {event.clientName}
                        </td>
                        <td className="px-6 py-4">
                           <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">{event.grantTicker}</span>
                           <span className="ml-2 text-xs text-slate-400">{event.grantType}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                           {formatNumber(event.shares)}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-600">
                           {formatCurrency(event.grossValue)}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <Button 
                             variant="secondary" 
                             onClick={() => handleDownloadICS(event)} 
                             className="ml-auto text-xs px-3 py-1.5 h-auto gap-2"
                             title="Add to Calendar"
                           >
                             <Download size={14} />
                             Add to Cal
                           </Button>
                        </td>
                      </tr>
                    ))
                 )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};