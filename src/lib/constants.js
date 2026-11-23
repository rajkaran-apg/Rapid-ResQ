export const TYPES = ['Accident', 'Fire', 'Medical Emergency', 'Infrastructure Failure', 'Other'];
export const TYPE_ICON = { Accident: '🚗', Fire: '🔥', 'Medical Emergency': '🚑', 'Infrastructure Failure': '🏗️', Other: '⚠️' };
export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
export const SEV_HEX = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e' };
export const SEV_CLASS = {
  Critical: 'border-red-500/50 bg-red-500/15 text-red-300', High: 'border-orange-500/50 bg-orange-500/15 text-orange-300',
  Medium: 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300', Low: 'border-green-500/50 bg-green-500/15 text-green-300'
};
export const STATUSES = ['REPORTED', 'VERIFIED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE', 'RESOLVED', 'REJECTED'];
export const STATUS_LABEL = { REPORTED: 'Reported', VERIFIED: 'Verified', ASSIGNED: 'Assigned', ACCEPTED: 'Accepted', EN_ROUTE: 'En route', ON_SITE: 'On site', RESOLVED: 'Resolved', REJECTED: 'Rejected' };
export const STATUS_CLASS = {
  REPORTED: 'border-slate-500/50 bg-slate-500/15 text-slate-300', VERIFIED: 'border-blue-500/50 bg-blue-500/15 text-blue-300',
  ASSIGNED: 'border-orange-500/50 bg-orange-500/15 text-orange-300', ACCEPTED: 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300',
  EN_ROUTE: 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300', ON_SITE: 'border-purple-500/50 bg-purple-500/15 text-purple-300',
  RESOLVED: 'border-green-500/50 bg-green-500/15 text-green-300', REJECTED: 'border-red-500/50 bg-red-500/15 text-red-300'
};
export const NEXT_STATUS = { ASSIGNED: 'ACCEPTED', ACCEPTED: 'EN_ROUTE', EN_ROUTE: 'ON_SITE', ON_SITE: 'RESOLVED' };
export const NEXT_LABEL = { ACCEPTED: 'Accept assignment', EN_ROUTE: 'Start moving — En route', ON_SITE: 'Arrived on site', RESOLVED: 'Mark resolved' };
export const HOME = { ADMIN: '/app', DISPATCHER: '/app', VIEWER: '/app', RESPONDER: '/app/assignments' };
export const INDORE = [22.7196, 75.8577];
