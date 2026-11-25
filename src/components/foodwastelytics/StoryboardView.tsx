"use client";

import { FOODWASTELYTICS_UI as UI } from "@/lib/foodwastelytics/data";

export function FoodwastelyticsStoryboard() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-16">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">{UI.storyBadge}</span>
        <h2 className="text-2xl sm:text-3xl font-black text-foreground">{UI.storyTitle}</h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">{UI.storyDesc}</p>
      </div>

      {/* Act 1 */}
      <div className="p-8 rounded-3xl bg-card/90 border border-border/50 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <span className="size-8 rounded-full bg-emerald-500/20 text-emerald-500 font-black flex items-center justify-center text-sm font-mono">
            {"1"}
          </span>
          <h3 className="text-lg font-extrabold text-foreground">{UI.act1Title}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {UI.act1Text1}
          <strong>{UI.act1Highlight}</strong>
          {UI.act1Text2}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
            <span className="text-xs text-muted-foreground block">{UI.act1Card1Title}</span>
            <span className="text-xl font-bold font-mono">{UI.act1Card1Val}</span>
          </div>
          <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
            <span className="text-xs text-muted-foreground block">{UI.act1Card2Title}</span>
            <span className="text-xl font-bold font-mono text-rose-500">{UI.act1Card2Val}</span>
          </div>
          <div className="p-4 rounded-xl bg-muted/40 border border-border/40">
            <span className="text-xs text-muted-foreground block">{UI.act1Card3Title}</span>
            <span className="text-xl font-bold font-mono text-emerald-500">{UI.act1Card3Val}</span>
          </div>
        </div>
      </div>

      {/* Act 2 */}
      <div className="p-8 rounded-3xl bg-card/90 border border-border/50 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <span className="size-8 rounded-full bg-emerald-500/20 text-emerald-500 font-black flex items-center justify-center text-sm font-mono">
            {"2"}
          </span>
          <h3 className="text-lg font-extrabold text-foreground">{UI.act2Title}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{UI.act2Text}</p>
      </div>

      {/* Act 3 */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-card/85 to-card/50 border border-emerald-500/30 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <span className="size-8 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-sm font-mono">
            {"3"}
          </span>
          <h3 className="text-lg font-extrabold text-foreground">{UI.act3Title}</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {UI.act3Text1}
          <strong>{UI.act3Highlight1}</strong>
          {UI.act3Text2}
          <strong>{UI.act3Highlight2}</strong>
          {UI.act3Text3}
          <strong>{UI.act3Highlight3}</strong>
          {UI.act3Text4}
        </p>
      </div>
    </div>
  );
}
