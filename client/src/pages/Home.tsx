/* ================================================================
   급등주주의보 — Home Page (v2)
   Design: Toss Securities inspired, mobile-first single column
   Features:
     - Storytelling hero section
     - Country dropdown filter (no "전체")
     - 1-column stock cards with expand detail
     - Update time as prominent section
     - PWA install toast (after 1 min)
     - Detailed disclaimer footer
     - ETF/Leverage excluded
   ================================================================ */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChevronDown, ChevronUp, RefreshCw, TrendingUp,
  Globe, Clock, AlertCircle, Info, ExternalLink, MapPin
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  market?: string;
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

// ─── PWA Install Toast ────────────────────────────────────────────
function PWAToast() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // 1분 후 표시
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
        <button
          onClick={() => setShow(false)}
          className="text-white/50 hover:text-white shrink-0 text-lg leading-none"
        >×</button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={install}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center"
          style={{ background: "oklch(0.52 0.22 260)", color: "white" }}
        >
          홈 화면에 추가
        </button>
        <button
          onClick={() => setShow(false)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white"
          style={{ background: "oklch(1 0 0 / 0.1)" }}
        >
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

  let freshness = "";
  if (diffMin < 5) freshness = "방금 업데이트";
  else if (diffMin < 60) freshness = `${diffMin}분 전 업데이트`;
  else if (diffMin < 1440) freshness = `${Math.floor(diffMin / 60)}시간 전 업데이트`;
  else freshness = `${Math.floor(diffMin / 1440)}일 전 업데이트`;

  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden"
      style={{ background: "oklch(0.94 0.04 260 / 0.5)", border: "1.5px solid oklch(0.52 0.22 260 / 0.15)" }}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} style={{ color: "oklch(0.52 0.22 260)" }} />
          <span className="text-xs font-semibold" style={{ color: "oklch(0.52 0.22 260)" }}>
            데이터 업데이트 현황
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-bold" style={{ color: "oklch(0.15 0.01 250)", fontFamily: "'JetBrains Mono', monospace" }}>
              {data.updated_at}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.22 260)" }}>
              {freshness}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "oklch(0.55 0.01 250)" }}>다음 업데이트</p>
            <p className="text-sm font-semibold" style={{ color: "oklch(0.35 0.01 250)" }}>
              {data.next_update || "평일 05:30 / 11:00"}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs"
          style={{ borderColor: "oklch(0.52 0.22 260 / 0.15)", color: "oklch(0.55 0.01 250)" }}>
          <span>스캔 <strong style={{ color: "oklch(0.15 0.01 250)" }}>{data.total_scanned}개</strong></span>
          <span>·</span>
          <span>기준 <strong style={{ color: "oklch(0.58 0.22 25)" }}>+{data.threshold}% 이상</strong></span>
          <span>·</span>
          <span>발견 <strong style={{ color: "oklch(0.58 0.22 25)" }}>{data.surge_count}개</strong></span>
        </div>
      </div>
    </div>
  );
}

// ─── Stock Card ───────────────────────────────────────────────────
function StockCard({ stock, defaultOpen }: { stock: Stock; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const flag = COUNTRY_FLAGS[stock.country] || "🌐";
  const exchange = EXCHANGE_LABEL[stock.exchange] || stock.exchange || "";

  const changePctStr = `+${stock.change_pct.toFixed(2)}%`;
  const isHighSurge = stock.change_pct >= 30;

  return (
    <div className="toss-card mx-4 mb-3 overflow-hidden">
      {/* Top accent bar based on surge level */}
      <div className="h-1 w-full"
        style={{
          background: isHighSurge
            ? "linear-gradient(90deg, oklch(0.58 0.22 25), oklch(0.68 0.18 45))"
            : "oklch(0.58 0.22 25)"
        }} />

      <div className="p-4">
        {/* Country + Exchange badge row */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{flag}</span>
          <span className="text-sm font-semibold" style={{ color: "oklch(0.35 0.01 250)" }}>
            {stock.country}
          </span>
          {exchange && (
            <span className="ticker-mono">{exchange}</span>
          )}
          {stock.ticker && (
            <span className="ticker-mono">{stock.ticker}</span>
          )}
        </div>

        {/* Name + Change rate */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-base leading-tight" style={{ color: "oklch(0.15 0.01 250)" }}>
              {stock.name}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: "oklch(0.55 0.01 250)" }}>
              {stock.price}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="surge-number-big">{changePctStr}</div>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.65 0.008 250)" }}>
              거래대금 {stock.volume}
            </p>
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: open ? "oklch(0.94 0.04 260 / 0.5)" : "oklch(0.96 0.003 250)",
            color: open ? "oklch(0.52 0.22 260)" : "oklch(0.45 0.01 250)",
          }}
        >
          {open ? (
            <><ChevronUp size={15} /><span>접기</span></>
          ) : (
            <><ChevronDown size={15} /><span>자세히 보기</span></>
          )}
        </button>
      </div>

      {/* Detail Panel */}
      {open && (
        <div className="detail-expand border-t px-4 pb-4"
          style={{ borderColor: "oklch(0.91 0.005 250)" }}>
          <div className="pt-3 space-y-0">
            <InfoRow label="소재지" value={`${flag} ${stock.country}`} />
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
            <div className="mt-3 p-3 rounded-xl" style={{ background: "oklch(0.96 0.003 250)" }}>
              <p className="text-xs leading-relaxed" style={{ color: "oklch(0.45 0.01 250)" }}>
                {stock.business_summary}
              </p>
            </div>
          )}

          {stock.website && (
            <a
              href={stock.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "oklch(0.52 0.22 260)" }}
            >
              <ExternalLink size={12} />
              공식 웹사이트 방문
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label, value, mono = false, subtext
}: {
  label: string; value: string; mono?: boolean; subtext?: string;
}) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <div className="text-right">
        <span className={`info-value ${mono ? "font-mono" : ""}`} style={{ fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}>
          {value || "정보 없음"}
        </span>
        {subtext && (
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.65 0.008 250)" }}>{subtext}</p>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────
function EmptyState({ threshold, country }: { threshold: number; country: string }) {
  return (
    <div className="mx-4 toss-card p-8 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: "oklch(0.96 0.003 250)" }}>
        <TrendingUp size={24} style={{ color: "oklch(0.65 0.008 250)" }} />
      </div>
      <h3 className="font-bold text-base mb-2" style={{ color: "oklch(0.15 0.01 250)" }}>
        현재 급등 종목 없음
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "oklch(0.55 0.01 250)" }}>
        {country !== "전체" ? `${country} ` : ""}해외주식 거래대금 상위 100개 종목 중<br />
        <strong style={{ color: "oklch(0.58 0.22 25)" }}>+{threshold}% 이상</strong> 상승한 개별 종목이 없습니다.
      </p>
      <p className="text-xs mt-3" style={{ color: "oklch(0.65 0.008 250)" }}>
        평일 05:30 · 11:00 KST 자동 업데이트
      </p>
    </div>
  );
}

// ─── Disclaimer Footer ────────────────────────────────────────────
function DisclaimerSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="disclaimer-section mt-8">
      <div className="container py-6">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={15} style={{ color: "oklch(0.55 0.01 250)" }} />
            <span className="text-sm font-semibold" style={{ color: "oklch(0.35 0.01 250)" }}>
              서비스 이용 안내 및 면책조항
            </span>
          </div>
          {open ? <ChevronUp size={15} style={{ color: "oklch(0.55 0.01 250)" }} />
                : <ChevronDown size={15} style={{ color: "oklch(0.55 0.01 250)" }} />}
        </button>

        {open && (
          <div className="mt-4 space-y-4 text-xs leading-relaxed" style={{ color: "oklch(0.50 0.01 250)" }}>

            <DisclaimerBlock title="📌 서비스 목적 및 한계">
              본 서비스 '급등주주의보'는 개인 투자자가 급등 주식에 진입하기 전 최소한의 기업 소재지 정보를 확인할 수 있도록 제작된 비영리 정보 제공 서비스입니다. 투자 권유, 매수·매도 추천, 수익 보장을 목적으로 하지 않습니다. 본 서비스의 정보를 기반으로 한 투자 결정 및 그 결과에 대한 책임은 전적으로 이용자 본인에게 있습니다.
            </DisclaimerBlock>

            <DisclaimerBlock title="📊 데이터 출처 및 정확성">
              <ul className="space-y-1.5 mt-1">
                <li>• <strong>종목 리스트 및 거래대금:</strong> 토스증권(tossinvest.com) 해외주식 거래대금 상위 100개 종목 기준. 토스증권의 실시간 데이터를 자동 수집하며, 토스증권 서버 점검·API 변경 등으로 인해 데이터가 누락되거나 지연될 수 있습니다.</li>
                <li>• <strong>등락률 및 현재가:</strong> 토스증권 표시 기준이며, 실제 거래소 가격과 환율 변동에 따라 차이가 있을 수 있습니다. 한국 원화 환산 가격은 참고용이며 실제 거래 가격과 다를 수 있습니다.</li>
                <li>• <strong>기업 상세 정보(대표자, 시가총액, 섹터, 산업군, 사업 요약):</strong> Yahoo Finance(finance.yahoo.com) API를 통해 수집됩니다. Yahoo Finance의 데이터 업데이트 주기 및 정확성에 의존하며, 실제 기업 현황과 다를 수 있습니다.</li>
                <li>• <strong>공매도 현황 및 이자율:</strong> fintel.io 데이터를 기준으로 합니다. 공매도 데이터는 미국 FINRA 규정에 따라 2주 지연 공시되며, 실시간 공매도 비율과 다를 수 있습니다. 한국 상장 종목의 공매도 정보는 제공되지 않을 수 있습니다.</li>
                <li>• <strong>시가총액 한화 환산:</strong> 수집 시점의 원/달러 환율을 기준으로 계산되며, 환율 변동에 따라 실제 한화 가치와 차이가 발생할 수 있습니다.</li>
                <li>• <strong>ETF, 레버리지, 인버스 상품:</strong> 본 서비스는 개별 기업 주식만을 대상으로 하며, ETF·레버리지·인버스 상품은 의도적으로 제외됩니다. 단, 자동 필터링 과정에서 일부 상품이 포함되거나 누락될 수 있습니다.</li>
              </ul>
            </DisclaimerBlock>

            <DisclaimerBlock title="⏰ 업데이트 주기 및 제한">
              본 서비스는 평일(월~금) 오전 5시 30분, 오전 11시 KST에 자동 업데이트됩니다. 다음 시간대에는 업데이트가 이루어지지 않습니다: 토요일·일요일 전일, 평일 오후 5시 30분 이후 ~ 익일 오전 5시 30분 이전, 한국 및 미국 증시 공휴일. 업데이트 실패 시 이전 데이터가 표시될 수 있으며, 표시된 업데이트 시각을 반드시 확인하시기 바랍니다.
            </DisclaimerBlock>

            <DisclaimerBlock title="⚠️ 투자 위험 고지">
              주식 투자는 원금 손실의 위험이 있습니다. 급등 종목은 단기간 내 급락할 가능성이 높으며, 특히 소형주·바이오·신기술 기업은 변동성이 매우 큽니다. 본 서비스에 표시된 종목은 단순 정보 제공 목적이며, 어떠한 형태의 투자 권유도 아닙니다. 투자 결정 전 반드시 해당 기업의 공시 자료, 재무제표, 전문 투자 자문사의 의견을 참고하시기 바랍니다. 금융투자상품 거래 시 발생하는 손실에 대해 본 서비스 운영자는 어떠한 법적 책임도 지지 않습니다.
            </DisclaimerBlock>

            <DisclaimerBlock title="🔒 개인정보 및 쿠키">
              본 서비스는 회원가입, 로그인, 개인정보 수집을 하지 않습니다. 방문자 통계를 위해 익명 분석 도구(Umami Analytics)를 사용할 수 있으며, 이는 개인을 식별하지 않습니다. 홈 화면 추가(PWA) 기능은 브라우저의 로컬 저장소를 사용하며, 서버로 전송되지 않습니다.
            </DisclaimerBlock>

            <div className="pt-2 border-t" style={{ borderColor: "oklch(0.91 0.005 250)" }}>
              <p className="text-xs" style={{ color: "oklch(0.65 0.008 250)" }}>
                본 서비스는 특정 증권사, 금융기관과 무관한 개인 운영 서비스입니다. 토스증권(주)은 본 서비스와 관련이 없으며, 본 서비스에서 토스증권 데이터를 참조하는 것은 공개된 웹페이지 정보를 활용하는 것입니다. 문의: 서비스 내 피드백 기능을 이용해 주세요.
              </p>
              <p className="text-xs mt-2" style={{ color: "oklch(0.70 0.008 250)" }}>
                마지막 업데이트: 2026년 5월 | 급등주주의보
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DisclaimerBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-semibold mb-1.5" style={{ color: "oklch(0.35 0.01 250)" }}>{title}</p>
      <div style={{ color: "oklch(0.50 0.01 250)" }}>{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function Home() {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/data/stocks.json?" + Date.now());
      if (!res.ok) throw new Error("데이터를 불러올 수 없습니다");
      const json: StockData = await res.json();
      setData(json);
      // 첫 로드 시 첫 번째 국가로 기본 선택
      if (json.stocks.length > 0 && !selectedCountry) {
        const countries = Array.from(new Set(json.stocks.map(s => s.country).filter(Boolean)));
        if (countries.length > 0) setSelectedCountry(countries[0]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Country list (no "전체")
  const countries = data
    ? Array.from(new Set(data.stocks.map(s => s.country).filter(Boolean)))
    : [];

  // Set default country after data loads
  useEffect(() => {
    if (countries.length > 0 && !selectedCountry) {
      setSelectedCountry(countries[0]);
    }
  }, [countries.join(",")]);

  const filtered = data?.stocks.filter(s => !selectedCountry || s.country === selectedCountry) ?? [];

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.98 0.002 250)" }}>

      {/* ── Hero / Storytelling Header ── */}
      <div className="hero-gradient px-5 pt-12 pb-10">
        <div className="max-w-sm mx-auto">
          {/* Logo row */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(1 0 0 / 0.2)" }}>
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">급등주주의보</span>
          </div>

          {/* Slogan */}
          <h1 className="text-white font-bold text-2xl leading-tight mb-3">
            끊지 못하겠다면<br />
            <span style={{ color: "oklch(0.95 0.05 80)" }}>딱 한번만 알아보자</span>
          </h1>
          <p className="text-white/80 text-sm leading-relaxed mb-5">
            뇌동매매 금지
          </p>

          {/* Story cards */}
          <div className="space-y-2.5">
            <StoryCard
              emoji="⚡"
              text="급등주는 타이밍이 생명. 종목 스터디를 하고 진입할 시간이 없다."
            />
            <StoryCard
              emoji="🌍"
              text="하지만 최소한 중국 주식인지, 이스라엘 주식인지는 알고 진입하자."
            />
            <StoryCard
              emoji="🛡️"
              text="중국·이스라엘 주식에 물려서 피해보는 정도는 막아보자는 거다."
            />
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="max-w-sm mx-auto">

        {/* Update time section */}
        <div className="pt-4">
          {data && !loading && <UpdateTimeSection data={data} />}
        </div>

        {/* Country filter dropdown */}
        {!loading && !error && countries.length > 0 && (
          <div className="px-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={13} style={{ color: "oklch(0.55 0.01 250)" }} />
              <span className="text-xs font-semibold" style={{ color: "oklch(0.45 0.01 250)" }}>
                소재 국가로 필터링
              </span>
            </div>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger
                className="w-full rounded-xl border-0 font-semibold"
                style={{
                  background: "oklch(1 0 0)",
                  boxShadow: "0 1px 3px oklch(0 0 0 / 0.08)",
                  color: "oklch(0.15 0.01 250)",
                  height: "48px",
                  fontSize: "0.9rem",
                }}
              >
                <div className="flex items-center gap-2">
                  {selectedCountry && COUNTRY_FLAGS[selectedCountry] && (
                    <span className="text-lg">{COUNTRY_FLAGS[selectedCountry]}</span>
                  )}
                  <SelectValue placeholder="국가 선택" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {countries.map(c => (
                  <SelectItem key={c} value={c}>
                    <div className="flex items-center gap-2">
                      <span>{COUNTRY_FLAGS[c] || "🌐"}</span>
                      <span>{c}</span>
                      <span className="text-xs ml-1" style={{ color: "oklch(0.65 0.008 250)" }}>
                        ({data?.stocks.filter(s => s.country === c).length}개)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw size={24} className="animate-spin" style={{ color: "oklch(0.52 0.22 260)" }} />
            <p className="text-sm" style={{ color: "oklch(0.55 0.01 250)" }}>
              데이터 불러오는 중...
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="mx-4 toss-card p-5 text-center">
            <AlertCircle size={24} className="mx-auto mb-2" style={{ color: "oklch(0.58 0.22 25)" }} />
            <p className="text-sm font-medium mb-3" style={{ color: "oklch(0.35 0.01 250)" }}>
              {error}
            </p>
            <button onClick={loadData} className="toss-btn-primary px-6 py-2.5 text-sm">
              다시 시도
            </button>
          </div>
        )}

        {/* Stock List */}
        {!loading && !error && data && (
          <>
            {filtered.length === 0 ? (
              <EmptyState threshold={data.threshold} country={selectedCountry} />
            ) : (
              <div className="pb-4">
                {/* Section header */}
                <div className="px-4 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: "oklch(0.58 0.22 25)" }} />
                    <span className="text-xs font-semibold" style={{ color: "oklch(0.45 0.01 250)" }}>
                      {selectedCountry && COUNTRY_FLAGS[selectedCountry]
                        ? `${COUNTRY_FLAGS[selectedCountry]} ${selectedCountry} `
                        : ""}
                      급등 종목 {filtered.length}개
                    </span>
                  </div>
                  <button
                    onClick={loadData}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "oklch(0.52 0.22 260)" }}
                  >
                    <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                    새로고침
                  </button>
                </div>

                {filtered.map(stock => (
                  <StockCard
                    key={`${stock.rank}-${stock.ticker}`}
                    stock={stock}
                    defaultOpen={false}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Info note */}
        <div className="mx-4 mb-4 flex items-start gap-2 p-3 rounded-xl"
          style={{ background: "oklch(0.96 0.003 250)" }}>
          <Info size={13} className="shrink-0 mt-0.5" style={{ color: "oklch(0.55 0.01 250)" }} />
          <p className="text-xs leading-relaxed" style={{ color: "oklch(0.55 0.01 250)" }}>
            ETF·레버리지·인버스 상품은 제외되며, 토스증권 해외주식 거래대금 상위 100개 개별 종목 기준입니다.
            공매도 데이터는 fintel.io 기준이며 2주 지연 공시됩니다.
          </p>
        </div>

        {/* Disclaimer */}
        <DisclaimerSection />

        {/* Bottom padding for PWA */}
        <div className="h-8" />
      </div>

      {/* PWA Install Toast */}
      <PWAToast />
    </div>
  );
}

function StoryCard({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl p-3"
      style={{ background: "oklch(1 0 0 / 0.12)" }}>
      <span className="text-lg shrink-0">{emoji}</span>
      <p className="text-sm text-white/85 leading-relaxed">{text}</p>
    </div>
  );
}
