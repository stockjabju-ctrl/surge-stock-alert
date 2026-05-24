#!/usr/bin/env python3
"""
급등주주의보 - 데이터 수집 스크립트 v2
토스증권 해외주식 거래대금 상위 종목을 가져와 20% 이상 급등 개별종목을 필터링하고
Yahoo Finance에서 상세 정보를 붙여 JSON으로 저장합니다.

변경사항:
- 토스증권 해외주식 탭 기준 (market=overseas)
- ETF, 레버리지, 인버스 상품 제외
- 한화 시가총액 환산 추가
- 업데이트 시간 제한 (토17:30~일21:00 제외)
"""

import json
import time
import sys
import os
import re
from datetime import datetime, timezone, timedelta

try:
    import yfinance as yf
except ImportError:
    print("yfinance not installed. Run: pip install yfinance")
    sys.exit(1)

# ─────────────────────────────────────────────
# 설정값
# ─────────────────────────────────────────────
# 토스증권 해외주식 거래대금 상위 탭
TOSS_URL = "https://www.tossinvest.com/?market=overseas&live-chart=biggest_market_amount&duration=realtime"
SURGE_THRESHOLD = 20.0
TOP_N = 100
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "stocks.json")
KST = timezone(timedelta(hours=9))

# USD/KRW 환율 (실시간 환율 없을 시 기본값)
DEFAULT_USD_KRW = 1440.0

# ETF / 레버리지 / 인버스 제외 키워드 (티커 또는 종목명에 포함 시 제외)
ETF_EXCLUDE_TICKERS = {
    "QQQ", "SPY", "TQQQ", "SQQQ", "SOXL", "SOXS", "VOO", "IWM",
    "JEPQ", "SMH", "SOXX", "XLE", "SCHD", "VXX", "BIL", "SGOV",
    "USO", "NVDL", "TSLL", "DRAM", "KORU", "TZA", "BOXX", "MUU",
    "SNXX", "NASA", "RGTX", "BIL", "UVXY", "SVXY", "SPXL", "SPXS",
    "LABU", "LABD", "TECL", "TECS", "FNGU", "FNGD", "ARKK", "ARKG",
    "GLD", "SLV", "TLT", "HYG", "LQD", "EEM", "EFA", "VTI", "VEA",
    "IEMG", "AGG", "BNDX", "VNQ", "XLRE", "XLF", "XLK", "XLV",
    "XLI", "XLY", "XLP", "XLU", "XLB", "XLC", "XLRE",
    "JEPI", "DIVO", "QYLD", "XYLD", "RYLD",
    "UPRO", "UMDD", "UDOW", "SDOW", "SPDN",
    "FXI", "KWEB", "ASHR", "CQQQ",
}

ETF_EXCLUDE_KEYWORDS = [
    "etf", "etn", "fund", "trust", "index", "ultra", "proshares",
    "direxion", "ishares", "vanguard", "invesco", "spdr",
    "3x", "2x", "-2x", "-3x", "leveraged", "inverse",
    "레버리지", "인버스", "선물", "etf", "etn",
]

def is_etf_or_leverage(name: str, ticker: str) -> bool:
    """ETF, 레버리지, 인버스 상품 여부 판별"""
    t = ticker.upper().strip()
    n = name.lower().strip()

    if t in ETF_EXCLUDE_TICKERS:
        return True
    for kw in ETF_EXCLUDE_KEYWORDS:
        if kw in n:
            return True
    # 티커가 4글자 이상이고 L/S로 끝나는 레버리지 패턴 (예: TQQQ, SOXL, TSLL)
    if re.match(r'^[A-Z]{3,5}[LS]$', t):
        return True
    return False


# ─────────────────────────────────────────────
# 업데이트 시간 제한 체크
# ─────────────────────────────────────────────
def should_skip_update() -> bool:
    """
    토 17:30 ~ 일 21:00 KST 사이에는 업데이트 안 함
    (미국 시장 주말 휴장 + 토스증권 데이터 없음)
    """
    now = datetime.now(KST)
    weekday = now.weekday()  # 0=월, 5=토, 6=일
    hour = now.hour
    minute = now.minute

    # 토요일 17:30 이후
    if weekday == 5 and (hour > 17 or (hour == 17 and minute >= 30)):
        return True
    # 일요일 21:00 이전
    if weekday == 6 and (hour < 21):
        return True

    return False


# ─────────────────────────────────────────────
# 환율 조회
# ─────────────────────────────────────────────
def get_usd_krw() -> float:
    """현재 USD/KRW 환율 조회 (yfinance)"""
    try:
        t = yf.Ticker("KRW=X")
        info = t.fast_info
        rate = getattr(info, "last_price", None)
        if rate and 1000 < rate < 2000:
            return float(rate)
    except Exception:
        pass
    return DEFAULT_USD_KRW


def format_krw(usd_amount_str: str, usd_krw: float) -> str:
    """USD 시가총액 문자열을 한화로 변환"""
    try:
        # "$68.2B" → 68.2B 파싱
        m = re.match(r'\$?([\d.]+)([TBM]?)', usd_amount_str.replace(",", ""))
        if not m:
            return ""
        num = float(m.group(1))
        unit = m.group(2)
        if unit == "T":
            usd = num * 1_000_000_000_000
        elif unit == "B":
            usd = num * 1_000_000_000
        elif unit == "M":
            usd = num * 1_000_000
        else:
            usd = num

        krw = usd * usd_krw
        if krw >= 1_000_000_000_000:
            return f"약 {krw/1_000_000_000_000:.1f}조원"
        elif krw >= 100_000_000:
            return f"약 {krw/100_000_000:.0f}억원"
        else:
            return f"약 {krw/10_000:.0f}만원"
    except Exception:
        return ""


# ─────────────────────────────────────────────
# 1단계: 토스증권 해외주식 크롤링
# ─────────────────────────────────────────────
def fetch_toss_data():
    print("[1/3] 토스증권 해외주식 거래대금 상위 종목 수집 중 (Selenium)...")

    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.common.by import By
        from bs4 import BeautifulSoup
    except ImportError as e:
        print(f"  [오류] 필수 패키지 미설치: {e}")
        return []

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--lang=ko-KR")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )

    driver = None
    try:
        try:
            from webdriver_manager.chrome import ChromeDriverManager
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=options)
        except Exception:
            driver = webdriver.Chrome(options=options)
    except Exception as e:
        print(f"  [오류] Chrome 드라이버 실행 실패: {e}")
        return []

    stocks = []
    try:
        driver.get(TOSS_URL)
        time.sleep(10)

        # 거래대금 버튼 클릭 확인
        try:
            btns = driver.find_elements(By.XPATH, "//button[@role='radio']")
            for btn in btns:
                if btn.text.strip() == "거래대금":
                    btn.click()
                    time.sleep(5)
                    break
        except Exception:
            pass

        time.sleep(5)

        html = driver.page_source
        soup = BeautifulSoup(html, "html.parser")
        content = soup.get_text(separator="\n", strip=True)
        lines = [l.strip() for l in content.split("\n") if l.strip()]
        stocks = parse_toss_lines(lines)

    except Exception as e:
        print(f"  [오류] 크롤링 실패: {e}")
    finally:
        if driver:
            driver.quit()

    print(f"  → {len(stocks)}개 종목 수집 완료")
    return stocks


def parse_toss_lines(lines):
    stocks = []
    start_idx = 0
    for idx, line in enumerate(lines):
        if "순위·" in line and "기준" in line:
            start_idx = idx + 4
            break

    i = start_idx
    rank = 1
    while i < len(lines) and rank <= TOP_N:
        line = lines[i]
        if line.strip().isdigit() and int(line.strip()) == rank:
            try:
                name = lines[i + 1].strip()
                price_raw = lines[i + 2].strip()
                change_raw = lines[i + 3].strip()
                volume_raw = lines[i + 4].strip()

                change_match = re.search(r"([+-]?\d+\.?\d*)\s*%", change_raw)
                change_pct = float(change_match.group(1)) if change_match else 0.0

                vol_match = re.search(r"([\d,]+)\s*(억|조|만)?원", volume_raw)
                vol_num = 0
                if vol_match:
                    vol_num = float(vol_match.group(1).replace(",", ""))
                    unit = vol_match.group(2) or ""
                    if unit == "조":
                        vol_num *= 10000
                    elif unit == "만":
                        vol_num /= 10000

                stocks.append({
                    "rank": rank,
                    "name": name,
                    "price": price_raw,
                    "change_pct": change_pct,
                    "volume": volume_raw,
                    "volume_num": vol_num,
                })
                rank += 1
                i += 5
                continue
            except (IndexError, ValueError):
                pass
        i += 1
    return stocks


# ─────────────────────────────────────────────
# 2단계: 급등 필터링 + ETF/레버리지 제외
# ─────────────────────────────────────────────
def filter_surge(stocks):
    print(f"[2/3] {SURGE_THRESHOLD}% 이상 급등 개별종목 필터링 중...")
    surged = []
    excluded_etf = 0
    for s in stocks:
        if s["change_pct"] < SURGE_THRESHOLD:
            continue
        ticker = get_ticker(s["name"]) or s["name"]
        if is_etf_or_leverage(s["name"], ticker):
            print(f"  [ETF/레버리지 제외] {s['name']} ({ticker})")
            excluded_etf += 1
            continue
        surged.append(s)

    print(f"  → {len(surged)}개 급등 개별종목 발견 (ETF/레버리지 {excluded_etf}개 제외)")
    return surged


# ─────────────────────────────────────────────
# 3단계: Yahoo Finance 상세 정보 수집
# ─────────────────────────────────────────────
TICKER_MAP = {
    "엔비디아": "NVDA", "테슬라": "TSLA", "애플": "AAPL",
    "마이크로소프트": "MSFT", "아마존": "AMZN", "알파벳 A": "GOOGL",
    "알파벳 C": "GOOG", "메타": "META", "AMD": "AMD",
    "인텔": "INTC", "마이크론 테크놀로지": "MU", "퀄컴": "QCOM",
    "TSMC(ADR)": "TSM", "ASML 홀딩(ADR)": "ASML", "ARM 홀딩스(ADR)": "ARM",
    "넷플릭스": "NFLX", "팔란티어": "PLTR", "보잉": "BA",
    "IBM": "IBM", "오라클": "ORCL", "서비스나우": "NOW",
    "마벨 테크놀로지": "MRVL", "에퀴닉스": "EQIX",
    "로켓 랩": "RKLB", "아이온큐": "IONQ", "리게티 컴퓨팅": "RGTI",
    "디 웨이브 퀀텀": "QBTS", "AST 스페이스모바일": "ASTS",
    "코인베이스": "COIN", "로빈후드": "HOOD", "스트래티지": "MSTR",
    "알리바바(ADR)": "BABA", "푸투 홀딩스(ADR)": "FUTU",
    "삼성전자": "005930.KS", "SK하이닉스": "000660.KS",
    "샌디스크": "SNDK", "웨스턴 디지털": "WDC", "델 테크놀로지스": "DELL",
    "세레브라스 시스템즈": "CBRS", "코어위브": "CRWV",
    "글로벌파운드리스": "GFS", "나비타스 세미컨덕터": "NVTS",
    "아이렌": "AIXI", "인플렉션": "INFN", "루멘텀 홀딩스": "LITE",
    "블룸 에너지": "BE", "코히런트": "COHR", "크리도 테크놀로지 그룹 홀딩": "CRDO",
    "AXT": "AXTI", "ASE 테크놀로지 홀딩(ADR)": "ASX",
    "TTM 테크놀로지스": "TTMI", "비스트라 에너지": "VST",
    "레드와이어": "RDW", "네비우스 그룹": "NBIS",
    "어플라이드 옵토일렉트로닉스": "AAOI", "노키아(ADR)": "NOK",
    "소파이 테크놀로지스": "SOFI", "플렉스": "FLEX",
    "에코스타": "SATS", "써클 인터넷 그룹": "CRCL",
    "베리사인": "VRSN", "펨비나 파이프라인": "PBA",
    "포르티스": "FTS", "티 로웨 프라이스 그룹": "TROW",
    "사우스 보우": "SOBO", "알곤퀸 파워 앤 유틸리티스": "AQN",
    "빌더스 퍼스트소스": "BLDR", "비트마인 이머션 테크놀로지스": "BTBT",
    "데스티니 테크 100": "DXYZ", "코드 에너지": "CDEX",
    "브룩필드 인프라스트럭처": "BIP", "올드 리퍼블릭 인터내셔널": "ORI",
    "LPL 파이낸셜 홀딩스": "LPLA", "아카리 테라퓨틱스": "ACRS",
    "인플렉션": "INFN", "리게티 컴퓨팅": "RGTI",
}

COUNTRY_KO = {
    "United States": "미국", "South Korea": "한국", "Korea": "한국",
    "Taiwan": "대만", "China": "중국", "Japan": "일본",
    "Netherlands": "네덜란드", "Finland": "핀란드", "Canada": "캐나다",
    "Germany": "독일", "United Kingdom": "영국", "France": "프랑스",
    "Singapore": "싱가포르", "Hong Kong": "홍콩", "Israel": "이스라엘",
    "Ireland": "아일랜드", "Cayman Islands": "케이맨 제도",
    "Bermuda": "버뮤다", "Sweden": "스웨덴", "Denmark": "덴마크",
    "Australia": "호주", "India": "인도", "Brazil": "브라질",
}

def get_ticker(name):
    if name in TICKER_MAP:
        return TICKER_MAP[name]
    if re.match(r'^[A-Z0-9.]+$', name):
        return name
    return None


def fetch_yahoo_info(ticker, usd_krw):
    try:
        t = yf.Ticker(ticker)
        info = t.info
        if not info:
            return None

        country_en = info.get("country", "")
        country = COUNTRY_KO.get(country_en, country_en) if country_en else "정보 없음"

        officers = info.get("companyOfficers", [])
        ceo = "정보 없음"
        for o in officers:
            title = o.get("title", "").upper()
            if "CEO" in title or "CHIEF EXECUTIVE" in title or "PRESIDENT" in title:
                ceo = o.get("name", "정보 없음")
                break
        if ceo == "정보 없음" and officers:
            ceo = officers[0].get("name", "정보 없음")

        mkt_cap = info.get("marketCap", 0)
        mkt_cap_str = "정보 없음"
        mkt_cap_krw = ""
        if mkt_cap:
            if mkt_cap >= 1_000_000_000_000:
                mkt_cap_str = f"${mkt_cap/1_000_000_000_000:.1f}T"
            elif mkt_cap >= 1_000_000_000:
                mkt_cap_str = f"${mkt_cap/1_000_000_000:.1f}B"
            else:
                mkt_cap_str = f"${mkt_cap/1_000_000:.0f}M"
            mkt_cap_krw = format_krw(mkt_cap_str, usd_krw)

        short_float = info.get("shortPercentOfFloat")
        short_ratio = info.get("shortRatio")
        if short_float is not None:
            short_str = f"{short_float*100:.1f}% (유동주식 대비)"
        elif short_ratio is not None:
            short_str = f"숏 레이시오 {short_ratio:.1f}일"
        else:
            short_str = "정보 없음"

        return {
            "country": country,
            "country_en": country_en,
            "ceo": ceo,
            "market_cap": mkt_cap_str,
            "market_cap_krw": mkt_cap_krw,
            "sector": info.get("sector", "정보 없음"),
            "industry": info.get("industry", "정보 없음"),
            "business_summary": (info.get("longBusinessSummary", "") or "")[:200],
            "short_interest": short_str,
            "short_interest_source": "fintel.io",
            "website": info.get("website", ""),
            "exchange": info.get("exchange", ""),
        }
    except Exception as e:
        print(f"    [경고] {ticker} 조회 실패: {e}")
        return None


def enrich_with_yahoo(stocks, usd_krw):
    print("[3/3] Yahoo Finance 상세 정보 수집 중...")
    enriched = []
    for stock in stocks:
        ticker = get_ticker(stock["name"])
        detail = {}
        if ticker:
            print(f"  → {stock['name']} ({ticker}) 조회 중...")
            detail = fetch_yahoo_info(ticker, usd_krw) or {}
            time.sleep(0.5)
        else:
            print(f"  → {stock['name']} 티커 미등록")

        enriched.append({
            **stock,
            "ticker": ticker or "",
            "country": detail.get("country", "정보 없음"),
            "country_en": detail.get("country_en", ""),
            "ceo": detail.get("ceo", "정보 없음"),
            "market_cap": detail.get("market_cap", "정보 없음"),
            "market_cap_krw": detail.get("market_cap_krw", ""),
            "sector": detail.get("sector", "정보 없음"),
            "industry": detail.get("industry", "정보 없음"),
            "business_summary": detail.get("business_summary", ""),
            "short_interest": detail.get("short_interest", "정보 없음"),
            "short_interest_source": detail.get("short_interest_source", "fintel.io"),
            "website": detail.get("website", ""),
            "exchange": detail.get("exchange", ""),
        })
    return enriched


# ─────────────────────────────────────────────
# 메인 실행
# ─────────────────────────────────────────────
def main():
    now_kst = datetime.now(KST)
    print(f"=== 급등주주의보 데이터 수집 시작 ({now_kst.strftime('%Y-%m-%d %H:%M KST')}) ===")

    # 업데이트 시간 제한 체크
    if should_skip_update():
        print("[건너뜀] 토 17:30 ~ 일 21:00 KST 구간은 업데이트하지 않습니다.")
        return

    # 환율 조회
    print("  환율 조회 중...")
    usd_krw = get_usd_krw()
    print(f"  USD/KRW: {usd_krw:.1f}")

    # 다음 업데이트 시간 계산
    weekday = now_kst.weekday()
    hour = now_kst.hour
    if hour < 5 or (hour == 5 and now_kst.minute < 30):
        next_update = now_kst.replace(hour=5, minute=30, second=0, microsecond=0)
    elif hour < 11:
        next_update = now_kst.replace(hour=11, minute=0, second=0, microsecond=0)
    else:
        # 다음날 05:30
        next_update = (now_kst + timedelta(days=1)).replace(hour=5, minute=30, second=0, microsecond=0)
    next_update_str = next_update.strftime("%Y-%m-%d 05:30 KST") if next_update.hour == 5 else next_update.strftime("%Y-%m-%d 11:00 KST")

    # 1. 토스증권 데이터 수집
    all_stocks = fetch_toss_data()
    if not all_stocks:
        print("[경고] 토스증권 데이터 수집 실패.")
        all_stocks = []

    # 2. 급등 필터링 + ETF 제외
    surged = filter_surge(all_stocks)

    # 3. Yahoo Finance 상세 정보 추가
    enriched = enrich_with_yahoo(surged, usd_krw) if surged else []

    # 4. JSON 저장
    output = {
        "updated_at": now_kst.strftime("%Y-%m-%d %H:%M KST"),
        "updated_at_iso": now_kst.isoformat(),
        "next_update": next_update_str,
        "threshold": SURGE_THRESHOLD,
        "total_scanned": len(all_stocks),
        "surge_count": len(enriched),
        "market": "해외주식",
        "source": "토스증권 해외주식 거래대금 상위",
        "usd_krw": usd_krw,
        "stocks": enriched,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # public 폴더에도 복사
    public_path = os.path.join(os.path.dirname(OUTPUT_PATH), "..", "client", "public", "data", "stocks.json")
    public_path = os.path.normpath(public_path)
    if os.path.exists(os.path.dirname(public_path)):
        import shutil
        shutil.copy2(OUTPUT_PATH, public_path)
        print(f"  → public 폴더에도 복사 완료")

    print(f"\n✅ 완료! {len(enriched)}개 급등 개별종목 → {OUTPUT_PATH}")
    if enriched:
        print("\n--- 급등 종목 목록 ---")
        for s in enriched:
            print(f"  {s['rank']:>3}위 {s['name']:<30} {s['change_pct']:+.2f}%  {s['volume']}  [{s.get('country','?')}]")
    else:
        print("\n  현재 급등 개별종목이 없습니다.")


if __name__ == "__main__":
    main()
