/* ================================================================
   급등주주의보 — Home Page
   Design: Dark Trading Terminal
   Layout: Fixed header + country filter + card grid
   ================================================================ */

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, RefreshCw, TrendingUp, Globe, AlertTriangle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
interface Stock {
  rank: number;
  name: string;
  ticker: string;
  price: string;
  change_pct: number;
  volume: string;
  country: string;
  country_en: string;
  ceo: string;
  market_cap: string;
  sector: string;
  industry: string;
  business_summary: string;
  short_interest: string;
  website: string;
  exchange: string;
}

interface StockData {
  updated_at: string;
  threshold: number;
  total_scanned: number;
  surge_count: number;
  stocks: Stock[];
}

// ─── Helpers ──────────────────────────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  "미국": "🇺🇸", "한국": "🇰🇷", "중국": "🇨🇳", "대만": "🇹🇼",
  "일본": "🇯🇵", "네덜란드": "🇳🇱", "캐나다": "🇨🇦", "핀란드": "🇫🇮",
  "독일": "🇩🇪", "영국": "🇬🇧", "싱가포르": "🇸🇬", "홍콩": "🇭🇰",
  "이스라엘": "🇮🇱", "아일랜드": "🇮🇪", "케이맨 제도": "🏝️",
  "버뮤다": "🏝️", "스웨덴": "🇸🇪", "덴마크": "🇩🇰",
};

function getRankBadgeClass(rank: number) {
  if (rank === 1) return "rank-badge-gold";
  if (rank === 2) return "rank-badge-silver";
  if (rank === 3) return "rank-badge-bronze";
  return "rank-badge-default";
}

function getChangeColor(pct: number) {
  if (pct >= 30) return "text-orange-400 surge-glow";
  if (pct >= 20) return "text-red-400 surge-glow";
  return "text-red-300";
}

// ─── PWA Install Banner ───────────────────────────────────────────
function PWABanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
  };

  if (!show) return null;
  return (
    <div className="pwa-banner mx-4 mb-4 rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-lg">📱</span>
        <span className="text-foreground/80">홈 화면에 추가하면 앱처럼 사용할 수 있어요</span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={install}
          className="text-xs px-3 py-1.5 rounded-md font-medium"
          style={{ background: "oklch(0.62 0.22 25)", color: "white" }}
        >
          추가
        </button>
        <button
          onClick={() => setShow(false)}
          className="text-xs px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

// ─── Stock Card ───────────────────────────────────────────────────
function StockCard({ stock, defaultOpen }: { stock: Stock; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const flag = COUNTRY_FLAGS[stock.country] || "🌐";

  return (
    <div className="card-terminal rounded-lg overflow-hidden">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: rank + name */}
          <div className="flex items-start gap-3 min-w-0">
            <span
              className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold font-mono-data ${getRankBadgeClass(stock.rank)}`}
            >
              {stock.rank}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground truncate text-sm leading-tight">
                  {stock.name}
                </span>
                {stock.ticker && (
                  <span className="ticker-badge shrink-0">{stock.ticker}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs">{flag}</span>
                <span className="text-xs text-muted-foreground">{stock.country}</span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-xs text-muted-foreground">거래대금 {stock.volume}</span>
              </div>
            </div>
          </div>

          {/* Right: change + price */}
          <div className="text-right shrink-0">
            <div className={`font-mono-data font-bold text-2xl leading-none ${getChangeColor(stock.change_pct)}`}>
              +{stock.change_pct.toFixed(2)}%
            </div>
            <div className="font-mono-data text-xs text-muted-foreground mt-1">
              {stock.price}
            </div>
          </div>
        </div>

        {/* Detail toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-accent/50"
        >
          {open ? (
            <>
              <ChevronUp size={13} />
              <span>접기</span>
            </>
          ) : (
            <>
              <ChevronDown size={13} />
              <span>자세히 보기</span>
            </>
          )}
        </button>
      </div>

      {/* Detail Panel */}
      {open && (
        <div className="detail-panel border-t border-border/50 p-4 bg-accent/20">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <DetailRow label="소재지" value={`${flag} ${stock.country}`} />
            <DetailRow label="대표자" value={stock.ceo} />
            <DetailRow label="시가총액" value={stock.market_cap} mono />
            <DetailRow label="섹터" value={stock.sector} />
            <DetailRow label="산업군" value={stock.industry} />
            <DetailRow label="공매도" value={stock.short_interest} mono />
          </div>
          {stock.business_summary && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {stock.business_summary}
              </p>
            </div>
          )}
          {stock.website && (
            <a
              href={stock.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-info hover:underline"
              style={{ color: "oklch(0.72 0.15 200)" }}
            >
              <Globe size={11} />
              공식 웹사이트
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-foreground/90 font-medium ${mono ? "font-mono-data" : ""}`}>
        {value || "정보 없음"}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────
function EmptyState({ threshold }: { threshold: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: "oklch(0.16 0.01 260)" }}>
        <TrendingUp size={28} className="text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        현재 급등 종목 없음
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
        거래대금 상위 100개 종목 중 <span className="text-foreground font-medium">+{threshold}% 이상</span> 상승한 종목이 없습니다.
        다음 업데이트 시간에 다시 확인해 주세요.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function Home() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("전체");
  const [detailOpenAll, setDetailOpenAll] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/data/stocks.json?" + Date.now());
      if (!res.ok) throw new Error("데이터를 불러올 수 없습니다");
      const json: StockData = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Country list
  const countries = data
    ? ["전체", ...Array.from(new Set(data.stocks.map((s) => s.country).filter(Boolean)))]
    : ["전체"];

  const filtered =
    data?.stocks.filter(
      (s) => selectedCountry === "전체" || s.country === selectedCountry
    ) ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 border-b border-border/60"
        style={{ background: "oklch(0.09 0.015 260 / 0.95)", backdropFilter: "blur(12px)" }}
      >
        <div className="container">
          <div className="flex items-center justify-between h-14 gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: "oklch(0.62 0.22 25)" }}>
                <AlertTriangle size={14} className="text-white" />
              </div>
              <span className="font-display text-xl text-foreground tracking-wide">
                급등주주의보
              </span>
            </div>

            {/* Update time + refresh */}
            <div className="flex items-center gap-2 shrink-0">
              {data && (
                <span className="text-xs text-muted-foreground hidden sm:block font-mono-data">
                  {data.updated_at}
                </span>
              )}
              <button
                onClick={loadData}
                disabled={loading}
                className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
              >
                <RefreshCw
                  size={14}
                  className={`text-muted-foreground ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sub-header: stats + detail toggle ── */}
      {data && !loading && (
        <div className="border-b border-border/40"
          style={{ background: "oklch(0.11 0.012 260)" }}>
          <div className="container py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono-data">
              <span>
                스캔 <span className="text-foreground font-semibold">{data.total_scanned}</span>개
              </span>
              <span className="text-border">|</span>
              <span>
                급등 <span className="font-bold" style={{ color: "oklch(0.62 0.22 25)" }}>
                  {filtered.length}
                </span>개
              </span>
              <span className="text-border">|</span>
              <span>기준 <span className="text-foreground">+{data.threshold}%</span></span>
            </div>
            {filtered.length > 0 && (
              <button
                onClick={() => setDetailOpenAll(!detailOpenAll)}
                className="text-xs px-3 py-1 rounded-md transition-colors font-medium"
                style={{
                  background: detailOpenAll ? "oklch(0.62 0.22 25 / 0.15)" : "oklch(0.16 0.01 260)",
                  color: detailOpenAll ? "oklch(0.62 0.22 25)" : "oklch(0.65 0.01 260)",
                  border: `1px solid ${detailOpenAll ? "oklch(0.62 0.22 25 / 0.4)" : "oklch(0.22 0.01 260)"}`,
                }}
              >
                {detailOpenAll ? "전체 접기" : "전체 자세히"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Country Filter ── */}
      {countries.length > 1 && (
        <div className="border-b border-border/40 overflow-x-auto"
          style={{ background: "oklch(0.10 0.012 260)" }}>
          <div className="container py-2.5">
            <div className="flex gap-2 w-max">
              {countries.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCountry(c)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-md font-medium transition-all duration-150 ${
                    selectedCountry === c ? "filter-btn-active" : "filter-btn-inactive"
                  }`}
                >
                  {c !== "전체" && COUNTRY_FLAGS[c] ? `${COUNTRY_FLAGS[c]} ` : ""}
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="container py-4">
        {/* PWA Banner */}
        <PWABanner />

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw size={28} className="animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">데이터 불러오는 중...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-lg p-4 border border-destructive/30 bg-destructive/10 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Stock Grid */}
        {!loading && !error && data && (
          <>
            {filtered.length === 0 ? (
              <EmptyState threshold={data.threshold} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((stock) => (
                  <StockCard
                    key={`${stock.rank}-${stock.name}`}
                    stock={stock}
                    defaultOpen={detailOpenAll}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/40 mt-8"
        style={{ background: "oklch(0.10 0.012 260)" }}>
        <div className="container py-5 text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            매일 <span className="text-foreground">05:30</span> · <span className="text-foreground">11:00</span> 자동 업데이트
            &nbsp;·&nbsp; 토스증권 거래대금 상위 100종목 기준
          </p>
          <p className="text-xs text-muted-foreground/60">
            본 서비스는 투자 권유가 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
