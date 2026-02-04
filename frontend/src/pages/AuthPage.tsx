import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Mail, Lock, User, Loader2, ArrowRight } from "lucide-react";

const AuthPage = ({ type }: { type: "login" | "signup" }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint =
        type === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await axios.post(
        `http://localhost:5011${endpoint}`,
        formData,
      );
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6 bg-mesh">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            HYPER-<span className="text-blue-500">FAST</span>
          </h1>
          <p className="text-slate-500 font-medium tracking-widest uppercase text-xs">
            {type === "login"
              ? "Secure Terminal Access"
              : "Create Neural Identity"}
          </p>
        </div>

        <div className="glass-card p-1 rounded-[2.5rem] bg-gradient-to-br from-white/20 to-transparent">
          <div className="bg-dark-900/90 backdrop-blur-3xl p-10 rounded-[2.3rem] space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {type === "signup" && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                    <User size={12} /> Full Name
                  </label>
                  <input
                    required
                    className="w-full px-6 py-4 rounded-2xl input-glass outline-none text-white text-lg"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                  <Mail size={12} /> Email Address
                </label>
                <input
                  required
                  type="email"
                  className="w-full px-6 py-4 rounded-2xl input-glass outline-none text-white text-lg"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                  <Lock size={12} /> Security Key
                </label>
                <input
                  required
                  type="password"
                  className="w-full px-6 py-4 rounded-2xl input-glass outline-none text-white text-lg"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm font-bold text-center">
                  {error}
                </p>
              )}

              <button
                disabled={loading}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white font-black text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <span>{type === "login" ? "Authorize" : "Initialize"}</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-slate-500 text-sm font-medium">
              {type === "login" ? "No identity yet?" : "Already recognized?"}{" "}
              <Link
                to={type === "login" ? "/signup" : "/login"}
                className="text-blue-400 hover:text-blue-300 font-bold underline underline-offset-4"
              >
                {type === "login" ? "Create one" : "Sign in here"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
