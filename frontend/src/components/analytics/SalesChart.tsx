/* 
  Recharts is a standard charting library for React. 
  Assuming it's installed or we use a simple SVG fallback if not.
  For this artifact, I will implement a responsive SVG chart to avoid dependency issues if Recharts is missing.
*/

export default function SalesChart({ data, title = "Hourly Sales" }) {
    const chartData = data || [
        { label: "12pm", value: 120 },
        { label: "1pm", value: 450 },
        { label: "2pm", value: 320 },
        { label: "3pm", value: 210 },
        { label: "4pm", value: 180 },
        { label: "5pm", value: 540 },
        { label: "6pm", value: 890 },
        { label: "7pm", value: 1100 },
        { label: "8pm", value: 950 },
    ];

    const maxValue = Math.max(...chartData.map(d => d.value));
    const _height = 200;
    const _width = 600;

    return (
        <div className="w-full bg-card border border-border rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-foreground font-bold text-lg">{title}</h3>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-xs text-muted-foreground">Revenue</span>
                </div>
            </div>

            <div className="relative h-48 w-full flex items-end justify-between gap-2">
                {chartData.map((d, i) => {
                    const barHeight = (d.value / maxValue) * 100;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                            <div
                                className="w-full bg-red-900/30 border-t border-red-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-red-500 relative"
                                style={{ height: `${barHeight}%`  /* keep-inline */ }}
                            >
                                {/* Tooltip */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-secondary text-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-border z-10">
                                    €{d.value}
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">{d.label}</span>
                        </div>
                    );
                })}

                {/* Grid lines */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between opacity-10">
                    <div className="w-full h-px bg-white"></div>
                    <div className="w-full h-px bg-white"></div>
                    <div className="w-full h-px bg-white"></div>
                    <div className="w-full h-px bg-white"></div>
                </div>
            </div>
        </div>
    );
}
