import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { SEV_HEX, STATUS_LABEL } from '../lib/constants.js';
import { ErrorBox, PageTitle, Spinner } from '../components/ui.jsx';

const COLORS = ['#ef4444', '#f97316', '#3b82f6', '#a855f7', '#94a3b8'];
const tip = { contentStyle: { background: '#0f172a', border: '1px solid #334155' } };
const Box = ({ title, children }) => <div className="card"><h3 className="mb-2 font-bold">{title}</h3><div style={{ height: 220 }}>{children}</div></div>;

export default function Analytics() {
  const { data, error, loading } = useFetch(() => api('/analytics?days=30'), []);
  if (loading && !data) return <Spinner />;
  if (!data) return <ErrorBox message={error} />;
  const sev = data.bySeverity.map(s => ({ ...s, fill: SEV_HEX[s.name] }));
  const status = data.byStatus.map(s => ({ name: STATUS_LABEL[s.name], value: s.value }));
  return (
    <div>
      <PageTitle right={<span className="text-xs text-green-400">● Live</span>}>Analytics</PageTitle>
      <div className="grid gap-3 md:grid-cols-2">
        <Box title="Incidents by type"><ResponsiveContainer><PieChart><Pie data={data.byType} dataKey="value" nameKey="name" outerRadius={80} label={e => e.value || ''}>{data.byType.map((_, n) => <Cell key={n} fill={COLORS[n]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></Box>
        <Box title="By severity"><ResponsiveContainer><BarChart data={sev}><XAxis dataKey="name" stroke="#64748b" fontSize={12} /><YAxis allowDecimals={false} stroke="#64748b" width={24} fontSize={11} /><Tooltip {...tip} /><Bar dataKey="value" radius={6}>{sev.map(s => <Cell key={s.name} fill={s.fill} />)}</Bar></BarChart></ResponsiveContainer></Box>
        <Box title="By status"><ResponsiveContainer><BarChart data={status}><XAxis dataKey="name" stroke="#64748b" fontSize={10} interval={0} angle={-25} height={50} textAnchor="end" /><YAxis allowDecimals={false} stroke="#64748b" width={24} fontSize={11} /><Tooltip {...tip} /><Bar dataKey="value" fill="#3b82f6" radius={6} /></BarChart></ResponsiveContainer></Box>
        <Box title="Reported vs resolved (30 days)"><ResponsiveContainer><LineChart data={data.daily}><XAxis dataKey="date" stroke="#64748b" fontSize={10} /><YAxis allowDecimals={false} stroke="#64748b" width={24} fontSize={11} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line dataKey="reported" stroke="#ef4444" dot={false} strokeWidth={2} /><Line dataKey="resolved" stroke="#22c55e" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer></Box>
      </div>
      <div className="card mt-3 overflow-x-auto"><h3 className="mb-2 font-bold">Team performance</h3>
        <table className="w-full min-w-[420px] text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="py-2">Team</th><th>Handled</th><th>Resolved</th><th>Avg response</th><th>Rating</th></tr></thead>
          <tbody>{data.teams.map(t => <tr key={t.id} className="border-t border-white/10"><td className="py-2 font-medium">{t.name}</td><td>{t.handled}</td><td>{t.resolved}</td><td>{t.avgResponseMin != null ? t.avgResponseMin + ' min' : '—'}</td><td>{t.avgRating != null ? t.avgRating + ' ★' : '—'}</td></tr>)}
            {data.teams.length === 0 && <tr><td colSpan="5" className="py-3 text-slate-400">No teams yet.</td></tr>}</tbody></table></div>
    </div>
  );
}
