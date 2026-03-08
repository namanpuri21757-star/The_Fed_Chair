/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Types ---

type Stats = {
  inflation: number;
  unemployment: number;
  gdp: number;
  rate: number;
};

type Scenario = {
  text: string;
  drift: {
    inflation: number;
    unemployment: number;
    gdp: number;
  };
};

type Phase = 'start' | 'briefing' | 'decision' | 'consequence' | 'final';

// --- Constants ---

const SCENARIOS: Scenario[] = [
  {
    text: "Consumer spending surged 4.2% last quarter. Prices are climbing.",
    drift: { inflation: 0.4, unemployment: -0.2, gdp: 0.3 }
  },
  {
    text: "Unemployment claims hit a 10-year high. Factories are laying off workers.",
    drift: { inflation: -0.3, unemployment: 0.5, gdp: -0.4 }
  },
  {
    text: "Oil prices spiked 40% due to geopolitical tensions in the Middle East.",
    drift: { inflation: 0.6, unemployment: 0.1, gdp: -0.2 }
  },
  {
    text: "Tech sector boom — stock market up 22%, but wage growth is outpacing productivity.",
    drift: { inflation: 0.3, unemployment: -0.3, gdp: 0.5 }
  },
  {
    text: "Recession fears grow as GDP contracts for a second consecutive quarter.",
    drift: { inflation: -0.2, unemployment: 0.4, gdp: -0.5 }
  },
  {
    text: "Inflation expectations becoming unanchored — public expects 6% inflation next year.",
    drift: { inflation: 0.5, unemployment: 0, gdp: 0.1 }
  },
  {
    text: "Housing market freezes as mortgage rates make homeownership unaffordable.",
    drift: { inflation: -0.1, unemployment: 0.2, gdp: -0.3 }
  },
  {
    text: "Strong jobs report: 350,000 jobs added, unemployment drops to 3.2%.",
    drift: { inflation: 0.2, unemployment: -0.4, gdp: 0.4 }
  }
];

const NEWS_TICKER = [
  "DOW JONES INDUSTRIAL AVERAGE DOWN 200 POINTS ON INFLATION FEARS...",
  "TREASURY YIELDS CLIMB AS INVESTORS ANTICIPATE FOMC DECISION...",
  "RETAIL SALES DATA BEATS EXPECTATIONS, SIGNALING CONSUMER RESILIENCE...",
  "MANUFACTURING INDEX SLIPS TO LOWEST LEVEL SINCE 2020...",
  "OIL FUTURES STABILIZE AFTER RECENT VOLATILITY...",
  "IMF WARNS OF GLOBAL GROWTH SLOWDOWN...",
  "LABOR PARTICIPATION RATE REMAINS STEADY AT 62.5%...",
  "HOUSING STARTS DROP AS MORTGAGE RATES WEIGH ON BUILDERS..."
];

const INITIAL_STATS: Stats = {
  inflation: 2.0,
  unemployment: 4.0,
  gdp: 2.5,
  rate: 5.25
};

// --- Icons (Inline SVGs) ---

const IconTrendingUp = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

const IconTrendingDown = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
);

const IconMinus = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const IconInfo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);

const IconRefresh = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
);

const IconChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);

// --- Components ---

const AnimatedCounter = ({ value, suffix = "%", decimals = 1, colorClass = "" }: { value: number, suffix?: string, decimals?: number, colorClass?: string }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = (value - displayValue) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(prev => prev + increment);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span className={colorClass}>{displayValue.toFixed(decimals)}{suffix}</span>;
};

const ProgressBar = ({ value, max = 10, label, colorClass = "text-[#00ff41]" }: { value: number, max?: number, label: string, colorClass?: string }) => {
  const blocks = 10;
  const filled = Math.max(0, Math.min(blocks, Math.round((value / max) * blocks)));
  const bar = "█".repeat(filled) + "░".repeat(blocks - filled);

  return (
    <div className="flex flex-col mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="opacity-70">{label}</span>
        <span className={colorClass}>{value.toFixed(1)}%</span>
      </div>
      <div className={`text-lg tracking-tighter ${colorClass}`}>
        {bar}
      </div>
    </div>
  );
};

export default function App() {
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>('start');
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [history, setHistory] = useState<Stats[]>([INITIAL_STATS]);
  const [currentScenario, setCurrentScenario] = useState<Scenario>(SCENARIOS[0]);
  const [usedScenarios, setUsedScenarios] = useState<number[]>([]);
  const [lastDecision, setLastDecision] = useState<string>("");
  const [headline, setHeadline] = useState("");
  const [hoveredDecision, setHoveredDecision] = useState<string | null>(null);

  const chartRef = useRef<HTMLCanvasElement>(null);

  // --- Game Logic ---

  const startGame = () => {
    setRound(1);
    setStats(INITIAL_STATS);
    setHistory([INITIAL_STATS]);
    setUsedScenarios([]);
    nextRound();
  };

  const nextRound = () => {
    let available = SCENARIOS.map((_, i) => i).filter(i => !usedScenarios.includes(i));
    if (available.length === 0) available = SCENARIOS.map((_, i) => i);
    const randomIndex = available[Math.floor(Math.random() * available.length)];
    setCurrentScenario(SCENARIOS[randomIndex]);
    setUsedScenarios([...usedScenarios, randomIndex]);
    setPhase('briefing');
  };

  const makeDecision = (decision: 'raise' | 'hold' | 'lower') => {
    setLastDecision(decision);
    const noise = () => (Math.random() * 0.2 - 0.1);
    let newStats = { ...stats };

    if (decision === 'raise') {
      newStats.rate += 0.25;
      newStats.inflation -= (0.3 + Math.random() * 0.3) + noise();
      newStats.unemployment += (0.2 + Math.random() * 0.2) + noise();
      newStats.gdp -= (0.2 + Math.random() * 0.1) + noise();
    } else if (decision === 'lower') {
      newStats.rate -= 0.25;
      newStats.inflation += (0.2 + Math.random() * 0.3) + noise();
      newStats.unemployment -= (0.1 + Math.random() * 0.2) + noise();
      newStats.gdp += (0.2 + Math.random() * 0.2) + noise();
    } else {
      // Hold
      newStats.inflation += currentScenario.drift.inflation + noise();
      newStats.unemployment += currentScenario.drift.unemployment + noise();
      newStats.gdp += currentScenario.drift.gdp + noise();
    }

    // Clamp values
    newStats.inflation = Math.max(-2, Math.min(15, newStats.inflation));
    newStats.unemployment = Math.max(2, Math.min(15, newStats.unemployment));
    newStats.gdp = Math.max(-10, Math.min(10, newStats.gdp));
    newStats.rate = Math.max(0, Math.min(20, newStats.rate));

    setStats(newStats);
    setHistory([...history, newStats]);
    generateHeadline(newStats);
    setPhase('consequence');
  };

  const generateHeadline = (s: Stats) => {
    if (s.inflation > 6) setHeadline("INFLATION CRISIS: Fed Under Fire as Prices Spiral");
    else if (s.unemployment > 7) setHeadline("JOBS CRISIS: Millions Out of Work Under Fed Chair's Watch");
    else if (s.gdp < 0) setHeadline("RECESSION CONFIRMED: Economy Contracts Two Quarters Running");
    else if (Math.abs(s.inflation - 2) < 1 && Math.abs(s.unemployment - 4) < 1) setHeadline("GOLDILOCKS ECONOMY: Fed Chair Praised for Steady Hand");
    else if (s.inflation < 1) setHeadline("DEFLATION FEARS: Fed Struggles to Spark Price Growth");
    else setHeadline("MARKETS REACT: Fed Policy Shift Sparks Heated Debate");
  };

  const handleNext = () => {
    if (round < 6) {
      setRound(round + 1);
      nextRound();
    } else {
      setPhase('final');
    }
  };

  const scoreData = useMemo(() => {
    if (history.length < 2) return { score: 0, title: "" };
    const avgInfDev = history.reduce((acc, s) => acc + Math.abs(s.inflation - 2), 0) / history.length;
    const avgUnempDev = history.reduce((acc, s) => acc + Math.abs(s.unemployment - 4), 0) / history.length;
    const score = Math.max(0, Math.min(100, Math.round(100 - (avgInfDev * 10) - (avgUnempDev * 10))));

    let title = "";
    if (score >= 90) title = "Paul Volcker Award — Legendary Fed Chair";
    else if (score >= 75) title = "Steady Hand — Solid Monetary Policy";
    else if (score >= 55) title = "Mixed Record — The Economy Survived... Barely";
    else title = "Fired — Congress Has Voted to Remove You";

    return { score, title };
  }, [history]);

  useEffect(() => {
    if (phase === 'final' && chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        const w = chartRef.current.width;
        const h = chartRef.current.height;
        ctx.clearRect(0, 0, w, h);

        // Draw axes
        ctx.strokeStyle = '#00ff41';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 20);
        ctx.lineTo(40, h - 40);
        ctx.lineTo(w - 20, h - 40);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#00ff41';
        ctx.font = '10px Courier New';
        ctx.fillText('10%', 10, 30);
        ctx.fillText('0%', 15, h - 35);
        ctx.fillText('R1', 40, h - 20);
        ctx.fillText('R6', w - 30, h - 20);

        const drawLine = (data: number[], color: string) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          data.forEach((val, i) => {
            const x = 40 + (i * (w - 60) / (data.length - 1));
            const y = (h - 40) - (val * (h - 60) / 10);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        };

        drawLine(history.map(s => s.inflation), '#ff4444'); // Inflation Red
        drawLine(history.map(s => s.unemployment), '#00cc88'); // Unemployment Teal
      }
    }
  }, [phase, history]);

  // --- Render Helpers ---

  const getStatColor = (type: 'inflation' | 'unemployment' | 'gdp', val: number) => {
    if (type === 'inflation') {
      if (val > 4 || val < 0.5) return "text-[#ff4444]";
      if (Math.abs(val - 2) < 0.5) return "text-[#00cc88]";
    }
    if (type === 'unemployment') {
      if (val > 6) return "text-[#ff4444]";
      if (Math.abs(val - 4) < 0.5) return "text-[#00cc88]";
    }
    if (type === 'gdp') {
      if (val < 0) return "text-[#ff4444]";
      if (val > 2) return "text-[#00cc88]";
    }
    return "text-[#00ff41]";
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="scanline-overlay" />
      <div className="scanline-bar" />

      {/* Main Terminal Container */}
      <div className="w-full max-w-4xl terminal-border bg-[#0a0a0a]/90 p-6 md:p-10 relative overflow-hidden flicker-effect">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[#00ff41] pb-4 mb-8">
          <div>
            <h1 className="terminal-heading text-2xl md:text-4xl">THE FED CHAIR</h1>
            <p className="text-xs opacity-60">MONETARY POLICY SIMULATOR v1.0 // FOMC SECURE TERMINAL</p>
          </div>
          <div className="text-right">
            <div className="text-sm">ROUND {round}/6</div>
            <div className="text-xs opacity-60 uppercase">{new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div className="transition-all duration-500">
          {phase === 'start' && (
            <div className="text-center space-y-8 animate-fade-in">
              <div className="space-y-4">
                <p className="text-lg leading-relaxed">
                  Welcome, Chair. The economy is in your hands.
                  Your dual mandate: maintain <span className="text-[#00cc88]">2% inflation</span> and <span className="text-[#00cc88]">4% unemployment</span>.
                </p>
                <p className="text-sm opacity-70">
                  Adjust interest rates to steer the nation through 6 quarters of economic volatility.
                  Every decision has tradeoffs. Good luck.
                </p>
              </div>
              <button
                onClick={startGame}
                className="group relative px-8 py-3 border border-[#00ff41] hover:bg-[#00ff41] hover:text-[#0a0a0a] transition-all duration-300 terminal-heading text-xl"
              >
                INITIALIZE SIMULATION
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
                  <IconChevronRight />
                </span>
              </button>
            </div>
          )}

          {phase === 'briefing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-in">
              <div className="space-y-6">
                <div className="terminal-border p-4 bg-[#00ff41]/5">
                  <h3 className="terminal-heading text-sm mb-2 opacity-70 flex items-center">
                    <IconInfo /> <span className="ml-2">ECONOMIC BRIEFING</span>
                  </h3>
                  <p className="text-lg italic leading-snug">"{currentScenario.text}"</p>
                </div>

                <div className="space-y-2">
                  <ProgressBar label="INFLATION RATE" value={stats.inflation} colorClass={getStatColor('inflation', stats.inflation)} />
                  <ProgressBar label="UNEMPLOYMENT" value={stats.unemployment} colorClass={getStatColor('unemployment', stats.unemployment)} />
                  <ProgressBar label="GDP GROWTH" value={stats.gdp} colorClass={getStatColor('gdp', stats.gdp)} />
                </div>
              </div>

              <div className="flex flex-col justify-center items-center space-y-6 border-l border-[#00ff41]/30 pl-8">
                <div className="text-center">
                  <div className="text-xs opacity-60 mb-1">CURRENT FED FUNDS RATE</div>
                  <div className="text-5xl font-bold tracking-tighter">
                    <AnimatedCounter value={stats.rate} />
                  </div>
                </div>
                <button
                  onClick={() => setPhase('decision')}
                  className="w-full py-4 border border-[#00ff41] hover:bg-[#00ff41] hover:text-[#0a0a0a] transition-all duration-300 terminal-heading"
                >
                  PROCEED TO DECISION
                </button>
              </div>
            </div>
          )}

          {phase === 'decision' && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="terminal-heading text-center text-xl mb-4">SELECT MONETARY STANCE</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onMouseEnter={() => setHoveredDecision('raise')}
                  onMouseLeave={() => setHoveredDecision(null)}
                  onClick={() => makeDecision('raise')}
                  className={`p-6 border border-[#00ff41] transition-all duration-300 flex flex-col items-center text-center space-y-3
                    ${hoveredDecision && hoveredDecision !== 'raise' ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}
                    hover:bg-[#00ff41] hover:text-[#0a0a0a]`}
                >
                  <IconTrendingUp />
                  <span className="terminal-heading text-lg">RAISE RATES</span>
                  <span className="text-[10px] opacity-70">+0.25% TIGHTEN</span>
                </button>

                <button
                  onMouseEnter={() => setHoveredDecision('hold')}
                  onMouseLeave={() => setHoveredDecision(null)}
                  onClick={() => makeDecision('hold')}
                  className={`p-6 border border-[#00ff41] transition-all duration-300 flex flex-col items-center text-center space-y-3
                    ${hoveredDecision && hoveredDecision !== 'hold' ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}
                    hover:bg-[#00ff41] hover:text-[#0a0a0a]`}
                >
                  <IconMinus />
                  <span className="terminal-heading text-lg">HOLD RATES</span>
                  <span className="text-[10px] opacity-70">0.00% MAINTAIN</span>
                </button>

                <button
                  onMouseEnter={() => setHoveredDecision('lower')}
                  onMouseLeave={() => setHoveredDecision(null)}
                  onClick={() => makeDecision('lower')}
                  className={`p-6 border border-[#00ff41] transition-all duration-300 flex flex-col items-center text-center space-y-3
                    ${hoveredDecision && hoveredDecision !== 'lower' ? 'opacity-30 scale-95' : 'opacity-100 scale-100'}
                    hover:bg-[#00ff41] hover:text-[#0a0a0a]`}
                >
                  <IconTrendingDown />
                  <span className="terminal-heading text-lg">LOWER RATES</span>
                  <span className="text-[10px] opacity-70">-0.25% EASE</span>
                </button>
              </div>

              <div className="h-16 flex items-center justify-center text-center px-4 border border-[#00ff41]/20 bg-[#00ff41]/5">
                {hoveredDecision === 'raise' && <p className="text-sm">"Raising rates increases borrowing costs, slowing spending and reducing inflation — but risks higher unemployment."</p>}
                {hoveredDecision === 'hold' && <p className="text-sm">"Maintaining current rates allows previous policy changes to filter through the economy while monitoring incoming data."</p>}
                {hoveredDecision === 'lower' && <p className="text-sm">"Lowering rates stimulates borrowing and investment, boosting growth and employment — but risks fueling inflation."</p>}
                {!hoveredDecision && <p className="text-sm opacity-50 italic">Hover over a stance to view policy implications...</p>}
              </div>
            </div>
          )}

          {phase === 'consequence' && (
            <div className="flex flex-col items-center animate-zoom-in">
              <div className="newspaper w-full max-w-2xl p-8 rotate-1 shadow-2xl mb-8">
                <div className="newspaper-masthead text-center py-2 mb-4">
                  <h1 className="text-4xl font-bold uppercase tracking-widest">The Federal Times</h1>
                  <div className="flex justify-between text-[10px] mt-1 px-1 font-sans font-bold">
                    <span>VOL. CXXIV ... NO. 54,321</span>
                    <span>WASHINGTON, D.C.</span>
                    <span>PRICE: $0.25</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold leading-tight text-center border-b border-black/20 pb-4">
                    {headline}
                  </h2>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="col-span-2 space-y-2">
                      <p className="first-letter:text-4xl first-letter:font-bold first-letter:float-left first-letter:mr-2">
                        The Federal Open Market Committee concluded its meeting today with a decisive move to {lastDecision} interest rates.
                        Market analysts are divided on the long-term impact as new data shows inflation at {stats.inflation.toFixed(1)}%
                        and unemployment at {stats.unemployment.toFixed(1)}%.
                      </p>
                      <p>
                        "The Chair is walking a tightrope," said one senior economist. "The dual mandate has never been harder to balance."
                      </p>
                    </div>
                    <div className="border-l border-black/20 pl-4 space-y-4">
                      <div className="text-center">
                        <div className="text-[10px] font-bold uppercase">Inflation</div>
                        <div className="text-2xl font-bold">{stats.inflation.toFixed(1)}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-bold uppercase">Jobs</div>
                        <div className="text-2xl font-bold">{stats.unemployment.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="px-12 py-3 bg-[#00ff41] text-[#0a0a0a] terminal-heading text-xl hover:bg-[#00cc88] transition-colors"
              >
                CONTINUE TO ROUND {round < 6 ? round + 1 : 'FINAL'}
              </button>
            </div>
          )}

          {phase === 'final' && (
            <div className="space-y-8 text-center animate-fade-in">
              <div className="space-y-2">
                <h2 className="terminal-heading text-3xl">PERFORMANCE REVIEW</h2>
                <div className="text-6xl font-bold text-[#00cc88]">{scoreData.score}/100</div>
                <div className="terminal-heading text-xl opacity-80">{scoreData.title}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="terminal-border p-4 bg-[#00ff41]/5">
                  <h3 className="terminal-heading text-sm mb-4">ECONOMIC TRENDS (R1-R6)</h3>
                  <canvas
                    ref={chartRef}
                    width={400}
                    height={250}
                    className="w-full h-auto"
                  />
                  <div className="flex justify-center space-x-4 mt-2 text-[10px]">
                    <span className="flex items-center"><span className="w-3 h-3 bg-[#ff4444] mr-1"></span> INFLATION</span>
                    <span className="flex items-center"><span className="w-3 h-3 bg-[#00cc88] mr-1"></span> UNEMPLOYMENT</span>
                  </div>
                </div>

                <div className="space-y-4 text-left">
                  <div className="terminal-border p-4">
                    <h4 className="terminal-heading text-xs opacity-60 mb-2">FINAL MANDATE STATUS</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Inflation Target (2%)</span>
                        <span className={getStatColor('inflation', stats.inflation)}>{stats.inflation.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Unemployment Target (4%)</span>
                        <span className={getStatColor('unemployment', stats.unemployment)}>{stats.unemployment.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>GDP Growth</span>
                        <span className={getStatColor('gdp', stats.gdp)}>{stats.gdp.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={startGame}
                    className="w-full py-4 border border-[#00ff41] hover:bg-[#00ff41] hover:text-[#0a0a0a] transition-all duration-300 terminal-heading flex items-center justify-center"
                  >
                    <span className="mr-2"><IconRefresh /></span> RESTART SIMULATION
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer News Ticker */}
        <div className="absolute bottom-0 left-0 w-full bg-[#00ff41]/10 border-t border-[#00ff41] py-1 ticker-wrap">
          <div className="ticker-content text-[10px] uppercase opacity-80">
            {NEWS_TICKER.join(" +++ ")} +++ {NEWS_TICKER.join(" +++ ")}
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="fixed top-4 left-4 opacity-20 text-[10px] pointer-events-none">
        SECURE_CONNECTION: ESTABLISHED<br />
        ENCRYPTION: AES-256<br />
        USER: FED_CHAIR_AUTH
      </div>
      <div className="fixed bottom-4 right-4 opacity-20 text-[10px] pointer-events-none text-right">
        SYSTEM_STATUS: NOMINAL<br />
        DATA_FEED: REAL-TIME<br />
        © 2026 FEDERAL RESERVE BOARD
      </div>
    </div>
  );
}


