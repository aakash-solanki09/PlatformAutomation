import React, { useState, useEffect } from "react";
import axios from "axios";
import { Globe, Plus, Trash2, Shield, Loader2, Save } from "lucide-react";

const API_BASE = "http://localhost:5011/api/platforms";

interface PlatformCredential {
  _id: string;
  platformName: string;
  loginUrl: string;
  username: string;
}

function Platforms() {
  const [credentials, setCredentials] = useState<PlatformCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [platformName, setPlatformName] = useState("LinkedIn");
  const [customName, setCustomName] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const fetchCredentials = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(API_BASE, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCredentials(res.data);
    } catch (err) {
      console.error("Fetch platforms error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("token");

    const finalName = platformName === "Other" ? customName : platformName;

    try {
      await axios.post(
        API_BASE,
        {
          platformName: finalName,
          loginUrl,
          username,
          password,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Reset form
      setCustomName("");
      setLoginUrl("");
      setUsername("");
      setPassword("");

      await fetchCredentials();
    } catch (err) {
      console.error("Save platform error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API_BASE}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchCredentials();
    } catch (err) {
      console.error("Delete platform error:", err);
    }
  };

  return (
    <div className="space-y-12 animate-slide-up">
      <header className="">
        <h1 className="text-4xl font-black text-white italic">
          Neural Platforms
        </h1>
        <p className="text-slate-500 font-medium uppercase tracking-[0.3em] text-[10px] mt-2">
          Manage Platform Credentials & Login Tokens
        </p>
      </header>

      <div className="grid xl:grid-cols-2 gap-12">
        {/* Add New Platform */}
        <div className="glass-card rounded-[3.5rem] p-12 bg-dark-900/60 space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <Plus className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-black text-white">
              Initialize Platform
            </h2>
          </div>

          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                  Source Platform
                </label>
                <select
                  className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white appearance-none cursor-pointer"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Glassdoor">Glassdoor</option>
                  <option value="Naukri">Naukri</option>
                  <option value="Wellfound">Wellfound</option>
                  <option value="Monster">Monster</option>
                  <option value="Other">Other (Custom)</option>
                </select>
              </div>
              {platformName === "Other" && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                    Custom Name
                  </label>
                  <input
                    required
                    className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white"
                    placeholder="e.g. Otta"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                Security Login URL
              </label>
              <input
                required
                className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white"
                placeholder="https://platform.com/login"
                value={loginUrl}
                onChange={(e) => setLoginUrl(e.target.value)}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                  Username
                </label>
                <input
                  required
                  className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white"
                  placeholder="Email or User ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                  Password
                </label>
                <input
                  required
                  type="password"
                  className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              disabled={saving}
              className="w-full py-7 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] text-white font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_rgba(59,130,246,0.3)] flex items-center justify-center gap-4"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <Save size={24} />
              )}
              <span>SAVE CREDENTIALS</span>
            </button>
          </form>
        </div>

        {/* List of Platforms */}
        <div className="glass-card rounded-[3.5rem] bg-black/40 flex flex-col border-white/5 overflow-hidden">
          <div className="px-12 py-8 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Globe size={18} className="text-blue-400" />
              <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
                Active Integrations
              </span>
            </div>
          </div>

          <div className="flex-1 p-12 space-y-6 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
              </div>
            ) : credentials.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Shield size={80} strokeWidth={0.5} className="mb-6" />
                <p className="font-black uppercase tracking-widest text-[10px]">
                  No Platforms Verified
                </p>
              </div>
            ) : (
              credentials.map((cred) => (
                <div
                  key={cred._id}
                  className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                      <Shield className="text-blue-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">
                        {cred.platformName}
                      </h3>
                      <p className="text-xs text-slate-500 font-bold font-mono truncate max-w-[200px]">
                        {cred.username}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(cred._id)}
                    className="p-4 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Platforms;
village: 32;
