import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Rocket,
  Terminal,
  Loader2,
  FileText,
  Globe,
  Settings2,
  Lock,
  User,
  UploadCloud,
} from "lucide-react";

const API_BASE = "http://localhost:5011/api";

interface Log {
  timestamp: string;
  message: string;
}

function App() {
  const [jobUrl, setJobUrl] = useState("https://www.linkedin.com/login");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [rules, setRules] = useState(
    "Expected salary: minimum $100,000 USD, Work type: 100% remote only, Employment type: full-time permanent, Location policy: no geographic or visa restrictions",
  );
  const [username, setUsername] = useState("SYNETALAAKASH@GMAIL.COM");
  const [password, setPassword] = useState("aakash@123");
  const [platform, setPlatform] = useState("LinkedIn");

  const [loading, setLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);

  const logEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) return alert("Please upload a resume");

    setLoading(true);
    setLogs([
      {
        timestamp: new Date().toISOString(),
        message: "Packaging deployment...",
      },
    ]);

    const formData = new FormData();
    formData.append("jobUrl", jobUrl);
    formData.append("resume", resumeFile);
    formData.append("rules", rules);
    formData.append("username", username);
    formData.append("password", password);
    formData.append("platformName", platform);

    try {
      const res = await axios.post(`${API_BASE}/apply`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setApplicationId(res.data.applicationId);
      setStatus("processing");
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          message: `Error: ${err?.response?.data?.error || err.message}`,
        },
      ]);
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden bg-mesh selection:bg-blue-500/30">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-float" />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-float"
        style={{ animationDelay: "-5s" }}
      />

      <div className="w-full max-w-7xl z-10 space-y-16 animate-slide-up">
        {/* Futuristic Header */}
        <header className="flex flex-col items-center text-center space-y-10">
          <div className="inline-flex items-center gap-4 px-6 py-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl transition-all hover:scale-105 active:scale-95 group cursor-default">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></span>
            </span>
            <span className="text-blue-400 text-sm font-black tracking-[0.4em] uppercase group-hover:text-blue-300 transition-colors">
              Neural Pipeline Active
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white leading-[0.85] !m-0">
              HYPER-
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-indigo-500 to-blue-600">
                FAST
              </span>
            </h1>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white/90">
              JOB AUTOMATOR
            </h2>
          </div>
        </header>

        <section className="grid xl:grid-cols-2 gap-12 items-stretch pt-6">
          {/* Configuration Terminal (Form) */}
          <div className="glass-card p-1 rounded-[3.5rem] bg-gradient-to-br from-white/20 via-transparent to-white/5 group shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
            <div className="bg-[#0a0a0c]/80 backdrop-blur-3xl p-10 md:p-14 rounded-[3.3rem] h-full flex flex-col space-y-10">
              <div className="space-y-3">
                <div className="h-1 w-12 bg-blue-500/50 rounded-full" />
                <h3 className="text-4xl font-black text-white tracking-tight leading-tight">
                  Deployment Ready
                </h3>
                <p className="text-slate-500 text-lg font-medium">
                  Input credentials and assets.
                </p>
              </div>

              <form onSubmit={handleApply} className="space-y-10 flex-1">
                <div className="space-y-8">
                  {/* Job URL */}
                  <div className="space-y-3 group/field">
                    <label
                      htmlFor="jobUrl"
                      className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 px-1 group-focus-within/field:text-blue-400 transition-colors"
                    >
                      <Globe size={16} /> Target Job Link
                    </label>
                    <input
                      id="jobUrl"
                      type="url"
                      required
                      placeholder="linkedin.com/jobs/view/..."
                      className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white placeholder:text-slate-800 text-xl font-medium"
                      value={jobUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setJobUrl(val);
                        // Auto-detect platform from URL
                        if (val.toLowerCase().includes("indeed.com"))
                          setPlatform("Indeed");
                        else if (val.toLowerCase().includes("glassdoor.com"))
                          setPlatform("Glassdoor");
                        else if (val.toLowerCase().includes("linkedin.com"))
                          setPlatform("LinkedIn");
                      }}
                    />
                  </div>

                  {/* Platform Selection */}
                  <div className="space-y-3 group/field">
                    <label
                      htmlFor="platform"
                      className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 px-1"
                    >
                      <Globe size={16} /> Target Platform
                    </label>
                    <select
                      id="platform"
                      className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white appearance-none cursor-pointer text-lg font-medium"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                    >
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Indeed">Indeed</option>
                      <option value="Glassdoor">Glassdoor</option>
                      <option value="Generic">Generic / Other</option>
                    </select>
                  </div>

                  {/* Credentials Row */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3 group/field">
                      <label
                        htmlFor="username"
                        className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 px-1"
                      >
                        <User size={16} /> Platform Email
                      </label>
                      <input
                        id="username"
                        type="email"
                        placeholder="your@email.com"
                        className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white placeholder:text-slate-800 text-lg font-medium"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3 group/field">
                      <label
                        htmlFor="password"
                        className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 px-1"
                      >
                        <Lock size={16} /> Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white placeholder:text-slate-800 text-lg font-medium"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Resume Upload */}
                  <div className="space-y-3 group/field">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 px-1">
                      <UploadCloud size={16} /> Local Resume Upload
                    </label>
                    <div className="relative group/upload">
                      <input
                        type="file"
                        accept=".pdf"
                        aria-label="Upload resume PDF"
                        onChange={(e) =>
                          setResumeFile(
                            e.target.files ? e.target.files[0] : null,
                          )
                        }
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className={`w-full px-8 py-10 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 ${
                          resumeFile
                            ? "border-blue-500/50 bg-blue-500/5"
                            : "border-white/10 hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <FileText
                          size={40}
                          className={
                            resumeFile ? "text-blue-500" : "text-slate-600"
                          }
                        />
                        <span className="text-lg font-bold text-slate-400">
                          {resumeFile
                            ? resumeFile.name
                            : "Choose PDF from device"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Logic */}
                  <div className="space-y-3 group/field">
                    <label
                      htmlFor="rules"
                      className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3 px-1 group-focus-within/field:text-blue-400 transition-colors"
                    >
                      <Settings2 size={16} /> Strategy Logic
                    </label>
                    <textarea
                      id="rules"
                      rows={3}
                      placeholder="e.g. Prefer Remote roles. Mention 5yrs React exp."
                      className="w-full px-8 py-6 rounded-3xl input-glass outline-none text-white placeholder:text-slate-800 text-lg font-medium resize-none transition-all"
                      value={rules}
                      onChange={(e) => setRules(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  disabled={loading || status === "processing"}
                  className="w-full py-8 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-2xl tracking-tight transition-all hover:scale-[1.02] hover:shadow-[0_0_60px_-10px_rgba(59,130,246,0.6)] active:scale-95 disabled:opacity-50 relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-center gap-5">
                    {loading || status === "processing" ? (
                      <Loader2 className="animate-spin" size={32} />
                    ) : (
                      <Rocket
                        size={32}
                        className="group-hover/btn:rotate-12 transition-transform"
                      />
                    )}
                    <span>
                      {status === "processing"
                        ? "AGENT ACTIVE"
                        : "INITIALIZE AGENT"}
                    </span>
                  </div>
                </button>
              </form>
            </div>
          </div>

          {/* Real-time Status Terminal */}
          <div className="glass-card rounded-[3.5rem] overflow-hidden bg-black/60 flex flex-col border-white/5 relative group/terminal shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

            {/* Terminal Header */}
            <div className="px-12 py-8 border-b border-white/10 bg-white/5 backdrop-blur-2xl flex items-center justify-between z-10">
              <div className="flex items-center gap-6">
                <div className="flex gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-red-500/30 border border-red-500/50" />
                  <div className="w-4 h-4 rounded-full bg-yellow-500/30 border border-yellow-500/50" />
                  <div className="w-4 h-4 rounded-full bg-green-500/30 border border-green-500/50" />
                </div>
                <div className="h-8 w-px bg-white/10 mx-2" />
                <div className="flex items-center gap-3 text-blue-400 font-mono text-xs font-black tracking-[0.3em] uppercase">
                  <Terminal size={18} strokeWidth={3} />
                  Agent-Core::V2
                </div>
              </div>
              <div
                className={`px-5 py-2 rounded-full text-[11px] font-black tracking-widest uppercase border transition-all ${
                  status === "applied"
                    ? "bg-green-500/20 text-green-400 border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                    : status === "failed"
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : status === "processing"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/40 animate-pulse"
                        : "bg-white/5 text-slate-500 border-white/10"
                }`}
              >
                {status || "Standby"}
              </div>
            </div>

            {/* Terminal Logs */}
            <div className="flex-1 p-12 overflow-y-auto terminal-scroll font-mono text-base leading-[2] z-10">
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center space-y-10 opacity-10 py-20 grayscale transition-all group-hover/terminal:opacity-20 group-hover/terminal:grayscale-0">
                  <Terminal
                    size={120}
                    strokeWidth={0.5}
                    className="animate-pulse-slow"
                  />
                  <p className="font-black tracking-[0.5em] uppercase text-sm">
                    System Awaiting Execution
                  </p>
                </div>
              )}
              <div className="space-y-6">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={`flex gap-6 pl-8 border-l-2 transition-all duration-700 ${
                      i === logs.length - 1
                        ? "border-blue-500 bg-blue-500/[0.03] py-2"
                        : "border-white/5 opacity-40"
                    }`}
                  >
                    <span className="text-slate-600 font-black whitespace-nowrap min-w-[100px] text-xs pt-1">
                      {new Date(log.timestamp || Date.now()).toLocaleTimeString(
                        [],
                        {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        },
                      )}
                    </span>
                    <span className="text-blue-500/30">»</span>
                    <span
                      className={`flex-1 ${
                        log.message.includes("Error")
                          ? "text-red-400 font-bold"
                          : log.message.includes("success") ||
                              log.message.includes("Applied")
                            ? "text-green-400 font-bold"
                            : "text-slate-100"
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>

            {/* Progress Metrics */}
            <div className="p-12 bg-[#050507]/60 border-t border-white/10 flex flex-col gap-8 z-10">
              <div className="flex items-center justify-between text-xs font-black tracking-[0.4em] text-slate-600 uppercase">
                <span className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${status === "processing" ? "bg-blue-500 animate-ping" : "bg-slate-800"}`}
                  />
                  Agent Throughput
                </span>
                <span className="text-blue-400">
                  {status === "applied"
                    ? "100.0%"
                    : status === "processing"
                      ? "74.2%"
                      : "0.00%"}
                </span>
              </div>
              <div className="h-2.5 bg-black/40 rounded-full overflow-hidden p-[2px]">
                <div
                  className={`h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${status === "processing" ? "w-3/4 shadow-[0_0_30px_rgba(59,130,246,0.5)]" : status === "applied" ? "w-full shadow-[0_0_30px_rgba(34,197,94,0.5)]" : "w-0"}`}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Extreme Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-0" />
    </div>
  );
}

export default App;
