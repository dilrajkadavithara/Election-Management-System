// Polling intervals (ms)
export const OCR_POLL_INTERVAL = 2000;
export const ELECTION_DAY_POLL_INTERVAL = 30000;
export const SYSTEM_HEALTH_POLL_INTERVAL = 2500;
export const STATS_DEBOUNCE_MS = 500;
export const FILTER_DEBOUNCE_MS = 500;

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const EXPORT_PAGE_SIZE = 0; // 0 = all

// Admin: Role definitions
export const ROLE_INFO = {
    BOOTH_AGENT: { label: 'Booth Agent', desc: 'Access to one or more booths', scope: 'booth' },
    ZONE_COMMANDER: { label: 'Zone Commander', desc: 'Access to a cluster of booths', scope: 'booth' },
    LOCAL_BODY_HEAD: { label: 'Local Body Head', desc: 'Access to an entire panchayat/municipality', scope: 'lb' },
    CONSTITUENCY_ADMIN: { label: 'Constituency Admin', desc: 'Access to an entire constituency', scope: 'constituency' },
    MANAGER: { label: 'Manager', desc: 'Full data access across all areas', scope: 'all' },
    OPERATOR: { label: 'Operator', desc: 'Data entry and upload only', scope: 'all' },
    SUPERUSER: { label: 'Super Admin', desc: 'Complete system control', scope: 'all' },
};

// Admin: Permission toggles
export const PERMISSIONS = [
    { key: 'can_download', label: 'Download Data', icon: '\u{1F4E5}', desc: 'Export voter lists as CSV/Excel' },
    { key: 'can_upload', label: 'Upload & OCR', icon: '\u{1F4E4}', desc: 'Upload and process voter lists' },
    { key: 'can_verify', label: 'Verify Records', icon: '\u2705', desc: 'Approve scanned voter data' },
    { key: 'can_edit_voters', label: 'Edit Voters', icon: '\u270F\uFE0F', desc: 'Edit voter details and phone numbers' },
    { key: 'can_send_broadcasts', label: 'Send Messages', icon: '\u{1F4AC}', desc: 'Send WhatsApp/SMS to voters' },
    { key: 'can_manage_system', label: 'Manage System', icon: '\u2699\uFE0F', desc: 'Add locations and parties' },
];

// Admin: Shared input styles
export const ADMIN_INPUT = "w-full bg-slate-900/60 text-white border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/60 transition-all placeholder-slate-600";
export const ADMIN_SELECT = ADMIN_INPUT + " appearance-none cursor-pointer";

// Party presets
export const PARTY_PRESETS = [
    { label: 'Congress (INC)', short: 'INC', color: '#000080', gradient: 'linear-gradient(to bottom, #FF9933, #ffffff, #138808)' },
    { label: 'Left (CPI/M)', short: 'CPIM', color: '#DE0000', gradient: 'linear-gradient(to bottom, #DE0000, #8B0000)' },
    { label: 'BJP', short: 'BJP', color: '#FF6600', gradient: 'linear-gradient(to bottom, #FF6600, #ffffff, #138808)' },
    { label: 'IUML', short: 'IUML', color: '#006600', gradient: 'linear-gradient(to bottom, #006600, #004400)' },
    { label: 'UDF', short: 'UDF', color: '#0033CC', gradient: 'linear-gradient(to bottom, #0033CC, #ffffff, #0033CC)' },
    { label: 'LDF', short: 'LDF', color: '#C00000', gradient: 'linear-gradient(to bottom, #DE0000, #ffffff, #DE0000)' },
];
