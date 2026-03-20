import { getDevices, getAlerts, DbDeviceWithChild } from "../../lib/supabase/queries";

type DeviceStatus = "online" | "offline" | "restricted";

const statusConfig: Record<DeviceStatus, { label: string; dot: string; badge: string }> = {
  online: {
    label: "Online",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  },
  offline: {
    label: "Offline",
    dot: "bg-slate-300",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  },
  restricted: {
    label: "Restricted",
    dot: "bg-orange-400",
    badge: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20",
  },
};

function deriveStatus(device: DbDeviceWithChild): DeviceStatus {
  if (device.status === "restricted") return "restricted";
  if (!device.last_seen) return "offline";
  const diffMs = Date.now() - new Date(device.last_seen).getTime();
  return diffMs > 5 * 60 * 1000 ? "offline" : "online";
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default async function DevicesPage() {
  const [dbDevices, dbAlerts] = await Promise.all([
    getDevices(),
    getAlerts(500),
  ]);

  // Pre-derive status for each device
  const devices = dbDevices.map((d) => ({
    ...d,
    derivedStatus: deriveStatus(d),
  }));

  const online = devices.filter((d) => d.derivedStatus === "online").length;
  const offline = devices.filter((d) => d.derivedStatus === "offline").length;
  const restricted = devices.filter((d) => d.derivedStatus === "restricted").length;

  // Count open (non-resolved) alerts per device_id
  const alertCountByDevice = dbAlerts.reduce<Record<string, number>>((acc, a) => {
    if (a.device_id) {
      acc[a.device_id] = (acc[a.device_id] ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Devices</h1>
          <p className="text-sm text-slate-500 mt-0.5">{devices.length} devices · {online} online</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Export
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            + Register Device
          </button>
        </div>
      </header>

      <main className="flex-1 p-8">
        {/* Status summary cards */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: "Online", value: online, color: "bg-emerald-500", textColor: "text-emerald-600", sub: "Actively monitored" },
            { label: "Offline", value: offline, color: "bg-slate-400", textColor: "text-slate-500", sub: "Not reachable" },
            { label: "Restricted", value: restricted, color: "bg-orange-400", textColor: "text-orange-600", sub: "Limited access mode" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.textColor}`}>{s.value}</p>
                <p className="text-sm font-medium text-slate-600">{s.label}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {["All", "Online", "Offline", "Restricted"].map((f, i) => (
            <button
              key={f}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i === 0
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search devices..."
              className="pl-9 pr-4 py-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400 w-56"
            />
          </div>
        </div>

        {/* Devices table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1.5fr_1fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Device</span>
            <span>Assigned To</span>
            <span>Type</span>
            <span>Status</span>
            <span>Last Seen</span>
            <span>Alerts</span>
          </div>

          <div className="divide-y divide-slate-50">
            {devices.map((device) => {
              const cfg = statusConfig[device.derivedStatus];
              const openAlerts = alertCountByDevice[device.id] ?? 0;
              const displayName = device.device_name ?? device.id.slice(0, 8);
              const childInitials = device.children?.initials ?? "Unassigned";
              const avatarLetters = childInitials.replace(/\./g, "").slice(0, 2);

              return (
                <div
                  key={device.id}
                  className="grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1.5fr_1fr] gap-4 px-6 py-4 items-center hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  {/* Device name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 flex-shrink-0">
                      <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                      <p className="text-xs text-slate-400">Managed device</p>
                    </div>
                  </div>

                  {/* Assigned to */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0">
                      {avatarLetters}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{childInitials}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {device.children?.age != null ? `Age ${device.children.age} · ` : ""}—
                      </p>
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <p className="text-sm text-slate-600">{device.device_type ?? "—"}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Last seen */}
                  <div>
                    <p className="text-sm text-slate-600">{formatLastSeen(device.last_seen)}</p>
                  </div>

                  {/* Open alerts */}
                  <div>
                    {openAlerts > 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                        {openAlerts}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-sm text-slate-400 mt-4">
          Showing {devices.length} of {devices.length} registered devices
        </p>
      </main>
    </div>
  );
}
