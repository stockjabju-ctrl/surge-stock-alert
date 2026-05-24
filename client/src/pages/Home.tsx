/* ================================================================
   급등주주의보 — Home Page v3
   Design: Toss list-style (거래대금 Top100 화면 참조)
   - No accent bar on cards
   - Stocks grouped by country (accordion-style dropdown)
   - Hero with proper storytelling copy
   - 15% threshold
   - RGTX and ETF/leverage excluded
   ================================================================ */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChevronDown, ChevronUp, RefreshCw, TrendingUp,
  Clock, AlertCircle, Info, ExternalLink
} from "lucide-react";

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
  market_cap_krw?: string;
  sector: string;
  industry: string;
  business_summary: string;
  short_interest: string;
  short_interest_source?: string;
  website: string;
  exchange: string;
}

interface StockData {
  updated_at: string;
  updated_at_iso: string;
  next_update?: string;
  threshold: number;
  total_scanned: number;
  surge_count: number;
  stocks: Stock[];
}

// ─── Constants ────────────────────────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  "미국": "🇺🇸", "한국": "🇰🇷", "중국": "🇨🇳", "대만": "🇹🇼",
  "일본": "🇯🇵", "네덜란드": "🇳🇱", "캐나다": "🇨🇦", "핀란드": "🇫🇮",
  "독일": "🇩🇪", "영국": "🇬🇧", "싱가포르": "🇸🇬", "홍콩": "🇭🇰",
  "이스라엘": "🇮🇱", "아일랜드": "🇮🇪", "케이맨 제도": "🏝️",
  "버뮤다": "🏝️", "스웨덴": "🇸🇪", "덴마크": "🇩🇰", "프랑스": "🇫🇷",
  "호주": "🇦🇺", "인도": "🇮🇳", "브라질": "🇧🇷",
};

const EXCHANGE_LABEL: Record<string, string> = {
  "NMS": "NASDAQ", "NGM": "NASDAQ", "NCM": "NASDAQ",
  "NYQ": "NYSE", "ASE": "AMEX",
  "KSC": "코스피", "KOQ": "코스닥",
};

// ─── PWA Toast (1분 후) ───────────────────────────────────────────
function PWAToast() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      timerRef.current = setTimeout(() => setShow(true), 60000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
  };

  if (!show) return null;
  return (
    <div className="pwa-toast">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">📱</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white mb-0.5">홈 화면에 추가하기</p>
          <p className="text-xs text-white/70 leading-relaxed">
            앱처럼 빠르게 접속하고 매일 업데이트를 바로 확인하세요
          </p>
        </div>
        <button onClick={() => setShow(false)} className="text-white/40 hover:text-white text-xl leading-none shrink-0">×</button>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={install} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white text-center"
          style={{ background: "oklch(0.50 0.22 260)" }}>
          홈 화면에 추가
        </button>
        <button onClick={() => setShow(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/50"
          style={{ background: "oklch(1 0 0 / 0.1)" }}>
          나중에
        </button>
      </div>
    </div>
  );
}

// ─── Update Time Section ──────────────────────────────────────────
function UpdateTimeSection({ data }: { data: StockData }) {
  const updatedDate = new Date(data.updated_at_iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - updatedDate.getTime()) / 60000);
  let freshness = diffMin < 5 ? "방금 업데이트" : diffMin < 60 ? `${diffMin}분 전` : diffMin < 1440 ? `${Math.floor(diffMin / 60)}시간 전` : `${Math.floor(diffMin / 1440)}일 전`;

  return (
    <div className="update-card">
      <div className="px-4 py-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Clock size={13} style={{ color: "oklch(0.50 0.22 260)" }} />
          <span className="text-xs font-semibold" style={{ color: "oklch(0.50 0.22 260)" }}>
            데이터 업데이트 현황
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="font-bold text-lg" style={{ fontFamily: "'JetBrains Mono', monospace", color: "oklch(0.13 0.01 250)" }}>
              {data.updated_at}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.22 260)" }}>{freshness} 업데이트</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "oklch(0.60 0.01 250)" }}>다음 업데이트</p>
            <p className="text-sm font-semibold" style={{ color: "oklch(0.30 0.01 250)" }}>
              {data.next_update || "평일 05:30 / 11:00"}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 flex items-center gap-3 text-xs"
          style={{ borderTop: "1px solid oklch(0.93 0.003 250)", color: "oklch(0.60 0.01 250)" }}>
          <span>스캔 <strong style={{ color: "oklch(0.13 0.01 250)" }}>{data.total_scanned}개</strong></span>
          <span style={{ color: "oklch(0.80 0.003 250)" }}>·</span>
          <span>기준 <strong style={{ color: "oklch(0.57 0.22 25)" }}>+{data.threshold}% 이상</strong></span>
          <span style={{ color: "oklch(0.80 0.003 250)" }}>·</span>
          <span>발견 <strong style={{ color: "oklch(0.57 0.22 25)" }}>{data.surge_count}개</strong></span>
        </div>
      </div>
    </div>
  );
}

// ─── Stock Row (Toss list style) ──────────────────────────────────
function StockRow({ stock }: { stock: Stock }) {
  const [open, setOpen] = useState(false);
  const exchange = EXCHANGE_LABEL[stock.exchange] || stock.exchange || "";

  return (
    <div>
      {/* Main row - toss list style */}
      <button
        className="stock-row w-full text-left px-4 py-3.5"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {/* Rank */}
          <span className="rank-num shrink-0">{stock.rank}</span>

          {/* Name + price */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm leading-tight" style={{ color: "oklch(0.13 0.01 250)" }}>
                {stock.name}
              </span>
              {stock.ticker && <span className="ticker-badge shrink-0">{stock.ticker}</span>}
            </div>
            <p className="price-text mt-0.5">{stock.price}</p>
          </div>

          {/* Change % + volume */}
          <div className="text-right shrink-0">
            <p className="surge-pct text-base">{`+${stock.change_pct.toFixed(1)}%`}</p>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.65 0.008 250)" }}>
              {stock.volume}
            </p>
          </div>

          {/* Expand icon */}
          <div className="shrink-0 ml-1">
            {open
              ? <ChevronUp size={16} style={{ color: "oklch(0.65 0.008 250)" }} />
              : <ChevronDown size={16} style={{ color: "oklch(0.65 0.008 250)" }} />
            }
          </div>
        </div>
      </button>

      {/* Detail panel */}
      {open && (
        <div className="detail-expand px-4 py-4"
          style={{ background: "oklch(0.975 0.002 250)", borderBottom: "1px solid oklch(0.91 0.004 250)" }}>
          {exchange && (
            <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.01 250)" }}>
              상장 거래소: <strong style={{ color: "oklch(0.30 0.01 250)" }}>{exchange}</strong>
            </p>
          )}
          <div className="space-y-0">
            <InfoRow label="대표자" value={stock.ceo} />
            <InfoRow
              label="시가총액"
              value={stock.market_cap_krw
                ? `${stock.market_cap} (${stock.market_cap_krw})`
                : stock.market_cap}
              mono
            />
            <InfoRow label="섹터" value={stock.sector} />
            <InfoRow label="산업군" value={stock.industry} />
            <InfoRow
              label="공매도"
              value={stock.short_interest}
              subtext={stock.short_interest_source ? `출처: ${stock.short_interest_source}` : undefined}
              mono
            />
          </div>

          {stock.business_summary && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: "oklch(1 0 0)" }}>
              <p className="text-xs leading-relaxed" style={{ color: "oklch(0.45 0.01 250)" }}>
                {stock.business_summary}
              </p>
            </div>
          )}

          {stock.website && (
            <a href={stock.website} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "oklch(0.50 0.22 260)" }}>
              <ExternalLink size={11} />
              공식 웹사이트
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono = false, subtext }: {
  label: string; value: string; mono?: boolean; subtext?: string;
}) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <div className="text-right">
        <span className="info-value" style={{ fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}>
          {value || "정보 없음"}
        </span>
        {subtext && <p className="text-xs mt-0.5" style={{ color: "oklch(0.65 0.008 250)" }}>{subtext}</p>}
      </div>
    </div>
  );
}

// ─── Country Group ────────────────────────────────────────────────
function CountryGroup({ country, stocks }: { country: string; stocks: Stock[] }) {
  const [open, setOpen] = useState(true);
  const flag = COUNTRY_FLAGS[country] || "🌐";

  return (
    <div className="section-card">
      {/* Group header */}
      <button
        className="w-full country-group-header"
        onClick={() => setOpen(!open)}
      >
        <span className="text-base">{flag}</span>
        <span>{country}</span>
        <span style={{ color: "oklch(0.65 0.008 250)", fontWeight: 400 }}>
          {stocks.length}개
        </span>
        <div className="ml-auto">
          {open
            ? <ChevronUp size={14} style={{ color: "oklch(0.65 0.008 250)" }} />
            : <ChevronDown size={14} style={{ color: "oklch(0.65 0.008 250)" }} />
          }
        </div>
      </button>

      {/* Stock rows */}
      {open && (
        <div>
          {stocks.map(stock => (
            <StockRow key={`${stock.rank}-${stock.ticker}`} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────
function EmptyState({ threshold }: { threshold: number }) {
  return (
    <div className="section-card p-8 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: "oklch(0.96 0.003 250)" }}>
        <TrendingUp size={22} style={{ color: "oklch(0.65 0.008 250)" }} />
      </div>
      <h3 className="font-bold text-base mb-2" style={{ color: "oklch(0.13 0.01 250)" }}>
        현재 급등 종목 없음
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "oklch(0.55 0.01 250)" }}>
        해외주식 거래대금 상위 100개 중<br />
        <strong style={{ color: "oklch(0.57 0.22 25)" }}>+{threshold}% 이상</strong> 상승한 개별 종목이 없습니다.
      </p>
      <p className="text-xs mt-3" style={{ color: "oklch(0.65 0.008 250)" }}>
        평일 05:30 · 11:00 KST 자동 업데이트
      </p>
    </div>
  );
}

// ─── Disclaimer ───────────────────────────────────────────────────
function DisclaimerSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="disclaimer-section">
      <div style={{ padding: "0 16px" }}>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-2 text-left py-4"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={14} style={{ color: "oklch(0.55 0.01 250)" }} />
            <span className="text-sm font-semibold" style={{ color: "oklch(0.35 0.01 250)" }}>
              서비스 이용 안내 및 면책조항
            </span>
          </div>
          {open ? <ChevronUp size={14} style={{ color: "oklch(0.55 0.01 250)" }} />
                : <ChevronDown size={14} style={{ color: "oklch(0.55 0.01 250)" }} />}
        </button>

        {open && (
          <div className="pb-6 space-y-5 text-xs leading-relaxed" style={{ color: "oklch(0.50 0.01 250)" }}>
            <DBlock title="📌 서비스 목적 및 한계">
              본 서비스 '급등주주의보'는 개인 투자자가 급등 주식에 진입하기 전 최소한의 기업 소재지 정보를 확인할 수 있도록 제작된 비영리 정보 제공 서비스입니다. 투자 권유, 매수·매도 추천, 수익 보장을 목적으로 하지 않습니다. 본 서비스의 정보를 기반으로 한 투자 결정 및 그 결과에 대한 책임은 전적으로 이용자 본인에게 있습니다.
            </DBlock>
            <DBlock title="📊 데이터 출처 및 정확성">
              <ul className="space-y-2 mt-1">
                <li>• <strong>종목 리스트 및 거래대금:</strong> 토스증권(tossinvest.com) 해외주식 거래대금 상위 100개 종목 기준. 토스증권의 실시간 데이터를 자동 수집하며, 서버 점검·구조 변경 등으로 인해 데이터가 누락되거나 지연될 수 있습니다.</li>
                <li>• <strong>등락률 및 현재가:</strong> 토스증권 표시 기준이며, 실제 거래소 가격과 환율 변동에 따라 차이가 있을 수 있습니다.</li>
                <li>• <strong>기업 상세 정보(대표자, 시가총액, 섹터, 산업군, 사업 요약):</strong> Yahoo Finance(finance.yahoo.com) API를 통해 수집됩니다. Yahoo Finance의 데이터 업데이트 주기 및 정확성에 의존하며, 실제 기업 현황과 다를 수 있습니다.</li>
                <li>• <strong>공매도 현황 및 이자율:</strong> fintel.io 데이터를 기준으로 합니다. 미국 FINRA 규정에 따라 2주 지연 공시되며, 실시간 공매도 비율과 다를 수 있습니다.</li>
                <li>• <strong>시가총액 한화 환산:</strong> 수집 시점의 원/달러 환율 기준이며, 환율 변동에 따라 실제 한화 가치와 차이가 발생할 수 있습니다.</li>
                <li>• <strong>ETF, 레버리지, 인버스 상품:</strong> 개별 기업 주식만을 대상으로 하며, ETF·레버리지·인버스 상품은 의도적으로 제외됩니다. 단, 자동 필터링 과정에서 일부 상품이 포함되거나 누락될 수 있습니다.</li>
              </ul>
            </DBlock>
            <DBlock title="⏰ 업데이트 주기 및 제한">
              평일(월~금) 오전 5시 30분, 오전 11시 KST에 자동 업데이트됩니다. 토요일 17:30 이후 ~ 일요일 21:00 이전에는 업데이트가 이루어지지 않습니다. 한국 및 미국 증시 공휴일에도 업데이트가 없을 수 있습니다.
            </DBlock>
            <DBlock title="⚠️ 투자 위험 고지">
              주식 투자는 원금 손실의 위험이 있습니다. 급등 종목은 단기간 내 급락할 가능성이 높으며, 특히 소형주·바이오·신기술 기업은 변동성이 매우 큽니다. 투자 결정 전 반드시 해당 기업의 공시 자료, 재무제표, 전문 투자 자문사의 의견을 참고하시기 바랍니다. 금융투자상품 거래 시 발생하는 손실에 대해 본 서비스 운영자는 어떠한 법적 책임도 지지 않습니다.
            </DBlock>
            <div className="pt-3" style={{ borderTop: "1px solid oklch(0.91 0.004 250)" }}>
              <p style={{ color: "oklch(0.65 0.008 250)" }}>
                본 서비스는 토스증권(주)과 무관한 개인 운영 서비스입니다. 토스증권 데이터 참조는 공개된 웹페이지 정보를 활용하는 것입니다.
              </p>
              <p className="mt-1.5" style={{ color: "oklch(0.70 0.008 250)" }}>
                2026년 5월 | 급등주주의보
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold mb-1.5" style={{ color: "oklch(0.35 0.01 250)" }}>{title}</p>
      <div>{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function Home() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => { loadData(); }, [loadData]);

  // Group stocks by country
  const grouped: Record<string, Stock[]> = {};
  if (data) {
    for (const s of data.stocks) {
      const c = s.country || "기타";
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(s);
    }
  }
  const countryOrder = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.975 0.002 250)" }}>

      {/* ── Hero ── */}
      <div className="hero-gradient px-5 pt-10 pb-9">
        <div style={{ maxWidth: 440, margin: "0 auto" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(1 0 0 / 0.2)" }}>
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">급등주주의보</span>
          </div>

          <h1 className="text-white font-bold leading-tight mb-2" style={{ fontSize: "1.6rem" }}>
            끊지 못하겠다면<br />
            <span style={{ color: "oklch(0.95 0.05 80)" }}>딱 한번만 알아보자</span>
          </h1>
          <p className="text-white/75 text-sm mb-5">뇌동매매 금지</p>

          <div className="space-y-2">
            <div className="story-card">
              <span className="text-lg shrink-0">⚡</span>
              <p className="text-sm text-white/85 leading-relaxed">
                급등주는 타이밍이 생명. 올라타야 할 때 종목 스터디를 할 시간이 없다.
              </p>
            </div>
            <div className="story-card">
              <span className="text-lg shrink-0">🌍</span>
              <p className="text-sm text-white/85 leading-relaxed">
                그래도 최소한, 지금 내가 올라타려는 게 중국 주식인지 이스라엘 주식인지는 알아야 하지 않겠어?
              </p>
            </div>
            <div className="story-card">
              <span className="text-lg shrink-0">🛡️</span>
              <p className="text-sm text-white/85 leading-relaxed">
                지정학 리스크 높은 나라 주식에 물려서 피해보는 일, 이 서비스로 조금이라도 줄여보자.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="pt-4">

          {/* Update time */}
          {data && !loading && <UpdateTimeSection data={data} />}

          {/* Section title */}
          {!loading && !error && data && data.stocks.length > 0 && (
            <div className="px-4 mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "oklch(0.57 0.22 25)" }} />
                <span className="text-sm font-bold" style={{ color: "oklch(0.25 0.01 250)" }}>
                  급등주 탑승 전 종목 정보 빠르게 보기
                </span>
              </div>
              <button onClick={loadData} className="flex items-center gap-1 text-xs"
                style={{ color: "oklch(0.50 0.22 260)" }}>
                <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                새로고침
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw size={22} className="animate-spin" style={{ color: "oklch(0.50 0.22 260)" }} />
              <p className="text-sm" style={{ color: "oklch(0.55 0.01 250)" }}>데이터 불러오는 중...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="section-card p-5 text-center">
              <AlertCircle size={22} className="mx-auto mb-2" style={{ color: "oklch(0.57 0.22 25)" }} />
              <p className="text-sm font-medium mb-3" style={{ color: "oklch(0.35 0.01 250)" }}>{error}</p>
              <button onClick={loadData} className="toss-btn px-6 py-2.5 text-sm">다시 시도</button>
            </div>
          )}

          {/* Country grouped stocks */}
          {!loading && !error && data && (
            <>
              {data.stocks.length === 0
                ? <EmptyState threshold={data.threshold} />
                : countryOrder.map(country => (
                    <CountryGroup
                      key={country}
                      country={country}
                      stocks={grouped[country]}
                    />
                  ))
              }
            </>
          )}

          {/* Info note */}
          {!loading && !error && data && (
            <div className="mx-4 mb-3 flex items-start gap-2 p-3 rounded-xl"
              style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.93 0.003 250)" }}>
              <Info size={12} className="shrink-0 mt-0.5" style={{ color: "oklch(0.60 0.01 250)" }} />
              <p className="text-xs leading-relaxed" style={{ color: "oklch(0.55 0.01 250)" }}>
                ETF·레버리지·인버스 상품 제외 / 토스증권 해외주식 거래대금 상위 100개 개별 종목 기준 / 공매도 데이터는 fintel.io 기준 (2주 지연 공시)
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <DisclaimerSection />
          <div className="h-10" />
        </div>
      </div>

      <PWAToast />
    </div>
  );
}
