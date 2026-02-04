import { useNavigate } from "react-router-dom";
import { Shield, Globe, Cpu } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark-950 text-white selection:bg-blue-500/30">
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-float" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] animate-float"
          style={{ animationDelay: "-5s" }}
        />

        <div className="z-10 text-center space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-blue-400 text-xs font-black tracking-[0.3em] uppercase">
              V2.0 Neural Engine
            </span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
            AUTOMATE YOUR
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600">
              CAREER GROWTH
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-slate-400 font-medium">
            The world's most advanced AI-driven job application engine. Apply to
            hundreds of relevant roles with precision-engineered automation.
          </p>

          <div className="flex flex-col md:flex-row gap-6 justify-center pt-8">
            <button
              onClick={() => navigate("/signup")}
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-[0_0_40px_-5px_rgba(59,130,246,0.5)]"
            >
              Get Started Now
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-10 py-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl font-black text-xl hover:bg-white/10 transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
        <FeatureCard
          icon={<Cpu size={32} />}
          title="AI Processing"
          description="Gemini-powered engine analyzes your resume and profile to perfectly fill complex application forms."
        />
        <FeatureCard
          icon={<Globe size={32} />}
          title="Multi-Platform"
          description="One-click deployment across LinkedIn, Indeed, Glassdoor and more with a single profile."
        />
        <FeatureCard
          icon={<Shield size={32} />}
          title="Secure Credentials"
          description="Enterprise-grade encryption for your platform credentials and personal data."
        />
      </section>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-3xl hover:bg-white/[0.07] transition-all group">
    <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 mb-8 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-2xl font-black mb-4">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{description}</p>
  </div>
);

export default LandingPage;
