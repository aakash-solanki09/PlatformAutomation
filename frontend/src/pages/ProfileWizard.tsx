import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  User,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  ChevronRight,
  ChevronLeft,
  Check,
  UploadCloud,
  Loader2,
  Cpu,
  Zap,
} from "lucide-react";

const ProfileWizard = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [profile, setProfile] = useState({
    bio: "",
    preferences: {
      expectedCtc: "",
      location: "",
      noticePeriod: "",
      remoteOnly: false,
      visaStatus: "",
    },
    aiProcessedData: {} as any,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get("http://localhost:5011/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setProfile((prev) => ({
            ...prev,
            bio: res.data.bio || "",
            preferences: {
              ...prev.preferences,
              ...(res.data.preferences || {}),
            },
            aiProcessedData: res.data.aiProcessedData || {},
          }));
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    if (resumeFile) formData.append("resume", resumeFile);
    formData.append(
      "data",
      JSON.stringify({
        bio: profile.bio,
        preferences: profile.preferences,
      }),
    );

    try {
      await axios.post("http://localhost:5011/api/user/profile", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      if (step < 3) setStep(step + 1);
    } catch (err) {
      alert("Save failed");
    } finally {
      setLoading(false);
    }
  };

  const runAiProcess = async () => {
    setAiProcessing(true);
    const token = localStorage.getItem("token");
    try {
      // 1. Sync current state (including new resume if any) to backend first
      const formData = new FormData();
      if (resumeFile) formData.append("resume", resumeFile);
      formData.append(
        "data",
        JSON.stringify({
          bio: profile.bio,
          preferences: profile.preferences,
        }),
      );

      await axios.post("http://localhost:5011/api/user/profile", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // 2. Trigger Neural Processing
      const res = await axios.post(
        "http://localhost:5011/api/user/process",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setProfile((prev) => ({
        ...prev,
        aiProcessedData: res.data.aiProcessedData,
      }));
      setStep(4);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Unknown error";
      alert(`AI processing failed: ${msg}`);
    } finally {
      setAiProcessing(false);
    }
  };

  const steps = [
    { title: "Personal Info", icon: <User size={20} /> },
    { title: "Requirements", icon: <Briefcase size={20} /> },
    { title: "Assets", icon: <UploadCloud size={20} /> },
    { title: "AI Audit", icon: <Cpu size={20} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-10">
      {/* Stepper */}
      <div className="flex justify-between items-center px-4 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 -z-10" />
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-3 transition-all duration-500 ${step > i ? "text-blue-400" : "text-slate-600"}`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                step === i + 1
                  ? "bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  : step > i + 1
                    ? "bg-blue-600/20 border-blue-500/40"
                    : "bg-dark-900 border-white/5"
              }`}
            >
              {step > i + 1 ? <Check size={20} /> : s.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {s.title}
            </span>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-[3rem] p-12 bg-dark-900/60 transition-all duration-500">
        {step === 1 && (
          <div className="space-y-8 animate-slide-up">
            <h2 className="text-3xl font-black text-white italic underline underline-offset-8 decoration-blue-500">
              Professional Identity
            </h2>
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Professional Bio / Introduction
              </label>
              <textarea
                rows={6}
                className="w-full px-8 py-6 rounded-3xl input-glass outline-none text-white text-lg font-medium resize-none"
                placeholder="Tell the AI about your expertise, career goals, and what makes you unique..."
                value={profile.bio}
                onChange={(e) =>
                  setProfile({ ...profile, bio: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-slide-up">
            <h2 className="text-3xl font-black text-white italic underline underline-offset-8 decoration-blue-500">
              Job Filters & Requirements
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <DollarSign size={14} /> Expected CTC ($/Year)
                </label>
                <input
                  className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white text-lg"
                  placeholder="e.g. 120,000"
                  value={profile.preferences.expectedCtc}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        expectedCtc: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={14} /> Preferred Location
                </label>
                <input
                  className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white text-lg"
                  placeholder="e.g. Remote, Europe, Bangalore"
                  value={profile.preferences.location}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        location: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={14} /> Notice Period (Days)
                </label>
                <input
                  className="w-full px-8 py-5 rounded-3xl input-glass outline-none text-white text-lg"
                  placeholder="e.g. 30"
                  value={profile.preferences.noticePeriod}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        noticePeriod: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5 mt-4">
                <span className="text-sm font-black text-slate-300 uppercase tracking-widest">
                  Remote Only Roles
                </span>
                <button
                  onClick={() =>
                    setProfile({
                      ...profile,
                      preferences: {
                        ...profile.preferences,
                        remoteOnly: !profile.preferences.remoteOnly,
                      },
                    })
                  }
                  className={`w-14 h-8 rounded-full relative transition-all ${profile.preferences.remoteOnly ? "bg-blue-600" : "bg-slate-800"}`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${profile.preferences.remoteOnly ? "left-7" : "left-1"}`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-slide-up flex flex-col items-center">
            <h2 className="text-3xl font-black text-white italic mb-4">
              Core Assets
            </h2>
            <div
              className={`w-full max-w-lg p-12 rounded-[3.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-6 cursor-pointer ${
                resumeFile
                  ? "border-blue-500/50 bg-blue-500/5 shadow-[0_0_50px_rgba(59,130,246,0.1)]"
                  : "border-white/10 hover:border-white/20"
              }`}
              onClick={() => document.getElementById("resume-input")?.click()}
            >
              <input
                id="resume-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) =>
                  e.target.files && setResumeFile(e.target.files[0])
                }
              />
              <UploadCloud
                size={64}
                className={resumeFile ? "text-blue-500" : "text-slate-600"}
              />
              <div className="text-center">
                <p className="text-xl font-black text-white">
                  {resumeFile ? resumeFile.name : "Upload Master Resume"}
                </p>
                <p className="text-slate-500 mt-2 font-medium uppercase tracking-widest text-[10px]">
                  PDF format strictly required
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-white italic">
                Neural Processing Outcome
              </h2>
              <button
                onClick={runAiProcess}
                disabled={aiProcessing}
                className="flex items-center gap-3 px-6 py-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 font-black uppercase text-[10px] tracking-widest hover:bg-blue-600/30 transition-all"
              >
                {aiProcessing ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Zap size={14} />
                )}
                Re-Process AI Data
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(profile.aiProcessedData).map(
                ([key, val]: [string, any]) => (
                  <div
                    key={key}
                    className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-2"
                  >
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                      {key.replace(/_/g, " ")}
                    </label>
                    <p className="text-slate-300 font-medium leading-relaxed">
                      {Array.isArray(val)
                        ? val.join(", ")
                        : val?.toString() || "---"}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        <div className="mt-16 flex justify-between gap-4">
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-8 py-5 rounded-2xl border border-white/10 text-slate-400 font-black hover:bg-white/5 transition-all text-sm uppercase tracking-widest flex items-center gap-3"
            >
              <ChevronLeft size={20} /> Back
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              onClick={(e) => handleSave(e)}
              disabled={loading}
              className="px-10 py-5 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all text-sm uppercase tracking-widest flex items-center gap-3 shadow-[0_0_30px_rgba(59,130,246,0.4)]"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Next Step <ChevronRight size={20} />
                </>
              )}
            </button>
          ) : step === 3 ? (
            <button
              onClick={runAiProcess}
              disabled={aiProcessing || !resumeFile}
              className="px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black transition-all text-sm uppercase tracking-widest flex items-center gap-3 shadow-[0_0_40px_rgba(59,130,246,0.3)] disabled:opacity-50"
            >
              {aiProcessing ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Process with Neural Engine <Cpu size={20} />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="px-10 py-5 rounded-2xl bg-green-600 text-white font-black hover:bg-green-500 transition-all text-sm uppercase tracking-widest flex items-center gap-3 shadow-[0_0_40px_rgba(34,197,94,0.3)]"
            >
              Finalize Profile <Check size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileWizard;
