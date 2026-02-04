import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Rocket, Terminal, Loader2 } from "lucide-react";

const API_BASE = "http://localhost:5011/api";

function Dashboard() {
  const [jobUrl, setJobUrl] = useState("");
  const [rules, setRules] = useState("");
  const [platform, setPlatform] = useState("");
  const [customPlatform, setCustomPlatform] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [savedPlatforms, setSavedPlatforms] = useState<any[]>([]);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      try {
        const [profileRes, platformsRes] = await Promise.all([
          axios.get(`${API_BASE}/user/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/platforms`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setProfileData(profileRes.data);
        const platforms = platformsRes.data;
        setSavedPlatforms(platforms);

        // Default to first saved platform or "Other"
        if (platforms.length > 0) {
          setPlatform(platforms[0].platformName);
        } else {
          setPlatform("Other");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setPlatform("Other");
      }
    };
    fetchData();
  }, []);

  // Auto-fill logic when platform changes
  useEffect(() => {
    if (platform === "Other") {
      setCustomPlatform("");
      setLoginUrl("");
      setUsername("");
      setPassword("");
      return;
    }

    const saved = savedPlatforms.find((p) => p.platformName === platform);
    if (saved) {
      const url = saved.loginUrl || "";
      setLoginUrl(url);
      setJobUrl(url); // Also fill Job Target URL
      setUsername(saved.username || "");
      setPassword(saved.password || "");
    } else {
      setLoginUrl("");
      setUsername("");
      setPassword("");
    }
  }, [platform, savedPlatforms]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    let interval: any;
    if (applicationId && status !== "applied" && status !== "failed") {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/status/${applicationId}`);
          setStatus(res.data.status);
          setLogs(res.data.logs);
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [applicationId, status]);

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("packaging");

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("jobUrl", jobUrl);
    formData.append(
      "platformName",
      platform === "Other" ? customPlatform : platform,
    );
    formData.append("loginUrl", loginUrl);
    formData.append("username", username);
    formData.append("password", password);

    const enrichedRules = `
      AI PROCESSED USER DATA: ${JSON.stringify(profileData?.aiProcessedData || {})}
      USER BIO: ${profileData?.bio || ""}
      USER PREFERENCES: ${JSON.stringify(profileData?.preferences || {})}
      EXTRA INFORMATION / CUSTOM CONTEXT: ${rules}
    `;
    formData.append("rules", enrichedRules);

    try {
      const res = await axios.post(`${API_BASE}/apply`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setApplicationId(res.data.applicationId);
      setStatus("processing");
    } catch (err: any) {
      console.error("Apply error:", err);
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-slide-up">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white italic">Dashboard</h1>
          <p className="text-slate-500 font-medium uppercase tracking-[0.3em] text-[10px] mt-2">
            Initiate Rapid Application
          </p>
        </div>
        {profileData?.aiProcessedData?.full_name && (
          <div className="px-6 py-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 font-black text-xs uppercase tracking-widest flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            AI Intelligence Integrated
          </div>
        )}
      </header>

      <section className="grid xl:grid-cols-2 gap-12">
        {/* Terminal Configuration */}
        <div className="glass-card rounded-[3.5rem] p-12 bg-dark-900/60 space-y-10">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">
              Application Parameters
            </h2>
            <p className="text-slate-500 text-sm">
              Configure target and platform credentials.
            </p>
          </div>

          <form onSubmit={handleApply} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                  Source Platform
                </label>
                <select
                  className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white appearance-none cursor-pointer"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  {savedPlatforms.map((p) => (
                    <option key={p._id} value={p.platformName}>
                      {p.platformName}
                    </option>
                  ))}
                  <option value="Other">Other (Custom)</option>
                </select>
              </div>
              {platform === "Other" ? (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                    Custom Platform Name
                  </label>
                  <input
                    required
                    className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white"
                    placeholder="e.g. Hired, Otta"
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                    Job Target URL
                  </label>
                  <input
                    required
                    className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white"
                    placeholder="https://..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                  />
                </div>
              )}
            </div>

            {platform === "Other" && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                    Platform Login URL
                  </label>
                  <input
                    required
                    className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white"
                    placeholder="https://platform.com/login"
                    value={loginUrl}
                    onChange={(e) => setLoginUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                    Job Target URL
                  </label>
                  <input
                    required
                    className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white"
                    placeholder="https://..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                  Username / Email
                </label>
                <input
                  className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white"
                  placeholder="Platform login"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={platform !== "Other"}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={platform !== "Other"}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                Extra Information / Custom Context
              </label>
              <textarea
                rows={4}
                className="w-full px-8 py-6 rounded-3xl input-glass outline-none text-white resize-none"
                placeholder="Add specific instructions for this application (e.g. emphasize Python skills, mention open source work)"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
              />
            </div>

            <button
              disabled={loading || status === "processing"}
              className="w-full py-7 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] text-white font-black text-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_rgba(59,130,246,0.3)] flex items-center justify-center gap-4"
            >
              {status === "processing" ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <Rocket size={24} />
              )}
              <span>
                {status === "processing"
                  ? "AGENT DEPLOYED"
                  : "INITIATE AUTOMATION"}
              </span>
            </button>
          </form>
        </div>

        {/* Real-time Logs */}
        <div className="glass-card rounded-[3.5rem] bg-black/40 flex flex-col border-white/5 overflow-hidden">
          <div className="px-12 py-8 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Terminal size={18} className="text-blue-400" />
              <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
                Live Operations Trace
              </span>
            </div>
            <div
              className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                status === "applied"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : status === "failed"
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : status === "processing"
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse"
                      : "bg-white/5 text-slate-600 border-white/10"
              }`}
            >
              {status || "Idle"}
            </div>
          </div>

          <div className="flex-1 p-12 overflow-y-auto font-mono text-sm leading-relaxed space-y-4">
            {logs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Terminal size={80} strokeWidth={0.5} className="mb-6" />
                <p className="font-black uppercase tracking-widest text-[10px]">
                  Awaiting Signal
                </p>
              </div>
            )}
            {logs.map((log, i) => (
              <div
                key={i}
                className={`flex gap-4 p-4 rounded-2xl ${i === logs.length - 1 ? "bg-blue-600/5 border border-blue-500/20" : "opacity-40"}`}
              >
                <span className="text-blue-500/50">
                  [
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour12: false,
                  })}
                  ]
                </span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
