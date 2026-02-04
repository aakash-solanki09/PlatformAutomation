import { NavLink, useNavigate } from "react-router-dom";
import {
  Terminal,
  User,
  LayoutDashboard,
  Settings,
  LogOut,
  ShieldCheck,
  Globe,
} from "lucide-react";

const Sidebar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <aside className="w-80 h-screen bg-dark-900 border-r border-white/5 flex flex-col p-8 fixed left-0 top-0 z-50">
      <div className="flex items-center gap-4 mb-16">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <Terminal size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">
            Hyper-<span className="text-blue-500">Fast</span>
          </h2>
          <div className="flex items-center gap-2 text-[10px] text-blue-500 font-bold tracking-widest uppercase">
            <ShieldCheck size={10} /> Secure Node
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4">
        <SidebarLink
          to="/dashboard"
          icon={<LayoutDashboard size={20} />}
          label="Agent Dashboard"
        />
        <SidebarLink
          to="/platforms"
          icon={<Globe size={20} />}
          label="Neural Platforms"
        />
        <SidebarLink
          to="/profile"
          icon={<User size={20} />}
          label="Neural Profile"
        />
        <SidebarLink
          to="/settings"
          icon={<Settings size={20} />}
          label="Core Settings"
        />
      </nav>

      <div className="pt-8 border-t border-white/5">
        <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/[0.03] mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white uppercase">
            {user.name?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {user.name || "User"}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {user.email || "online"}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-black uppercase text-xs tracking-widest"
        >
          <LogOut size={18} /> Disconnect
        </button>
      </div>
    </aside>
  );
};

const SidebarLink = ({
  to,
  icon,
  label,
}: {
  to: string;
  icon: any;
  label: string;
}) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all font-black uppercase text-xs tracking-widest
      ${isActive ? "bg-blue-600 text-white shadow-[0_10px_30px_rgba(59,130,246,0.3)]" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}
    `}
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

export default Sidebar;
