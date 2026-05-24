#!/usr/bin/env python3
"""
급등주주의보 - 데이터 수집 스크립트 v3
토스증권 해외주식 거래대금 상위 종목을 가져와 15% 이상 급등 개별종목을 필터링하고
Yahoo Finance에서 상세 정보를 붙여 JSON으로 저장합니다.

변경사항 v3:
- market=us (해외탭 정확한 파라미터로 수정)
- RGTI(리게티 컴퓨팅) ETF 제외 목록에서 제거 (일반 주식)
- Selenium 스크롤 추가 → 100개 전체 로딩
- 업데이트 스케줄 오후 5:30 / 오후 11:00 KST
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
# 토스증권 해외주식(미국) 거래대금 탭 — market=us 가 실제 해외 탭 파라미터
TOSS_URL = "https://www.tossinvest.com/?market=us&live-chart=biggest_market_amount&duration=realtime"
SURGE_THRESHOLD = 15.0
TOP_N = 100
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "stocks.json")
KST = timezone(timedelta(hours=9))

DEFAULT_USD_KRW = 1440.0

# ─── ETF / 레버리지 / 인버스 제외 목록 ───
# ※ RGTI(리게티 컴퓨팅)은 양자컴퓨터 개별주 → 제외 목록에서 삭제
ETF_EXCLUDE_TICKERS = {
    "QQQ", "SPY", "TQQQ", "SQQQ", "SOXL", "SOXS", "VOO", "IWM",
    "JEPQ", "SMH", "SOXX", "XLE", "SCHD", "VXX", "BIL", "SGOV",
    "USO", "NVDL", "TSLL", "DRAM", "KORU", "TZA", "BOXX", "MUU",
    "SNXX", "NASA", "RGTX", "UVXY", "SVXY", "SPXL", "SPXS",
    "LABU", "LABD", "TECL", "TECS", "FNGU", "FNGD", "ARKK", "ARKG",
    "GLD", "SLV", "TLT", "HYG", "LQD", "EEM", "EFA", "VTI", "VEA",
    "IEMG", "AGG", "BNDX", "VNQ", "XLRE", "XLF", "XLK", "XLV",
    "XLI", "XLY", "XLP", "XLU", "XLB", "XLC",
    "JEPI", "DIVO", "QYLD", "XYLD", "RYLD",
    "UPRO", "UMDD", "UDOW", "SDOW", "SPDN",
    "FXI", "KWEB", "ASHR", "CQQQ",
    "IVV", "IBIT", "FBTC", "GBTC",
    # 국내 ETF/레버리지
    "NVDU", "BEX", "SMCY",
}

ETF_EXCLUDE_KEYWORDS = [
    "etf", "etn", "fund", "trust", "index", "ultra", "proshares",
    "direxion", "ishares", "vanguard", "invesco", "spdr",
    "3x", "2x", "-2x", "-3x", "leveraged", "inverse",
    "레버리지", "인버스", "선물",
]

def is_etf_or_leverage(name: str, ticker: str) -> bool:
    t = ticker.upper().strip()
    n = name.lower().strip()
    if t in ETF_EXCLUDE_TICKERS:
        return True
    for kw in ETF_EXCLUDE_KEYWORDS:
        if kw in n:
            return True
    # 4~6글자 티커가 L/S로 끝나는 레버리지 패턴 (SOXL, TSLL 등)
    # 단, 4글자 이하 정상 주식 제외 (TSLA, AAPL 등은 해당 없음)
    if re.match(r'^[A-Z]{4,6}[LS]$', t):
        return True
    return False

# ─────────────────────────────────────────────
# 업데이트 시간 제한
# ─────────────────────────────────────────────
def should_skip_update() -> bool:
    """토 17:30 ~ 일 21:00 KST 구간 스킵"""
    now = datetime.now(KST)
    wd = now.weekday()  # 0=월 … 5=토 6=일
    h, m = now.hour, now.minute
    if wd == 5 and (h > 17 or (h == 17 and m >= 30)):
        return True
    if wd == 6 and h < 21:
        return True
    return False

def next_update_str(now_kst: datetime) -> str:
    """다음 업데이트 시각 문자열 반환 (17:30 / 23:00 KST 기준)"""
    h, m = now_kst.hour, now_kst.minute
    # 아직 오늘 17:30 안 됐으면
    if h < 17 or (h == 17 and m < 30):
        t = now_kst.replace(hour=17, minute=30, second=0, microsecond=0)
        return t.strftime("%Y-%m-%d 17:30 KST")
    # 오늘 23:00 안 됐으면
    if h < 23:
        t = now_kst.replace(hour=23, minute=0, second=0, microsecond=0)
        return t.strftime("%Y-%m-%d 23:00 KST")
    # 내일 17:30
    t = (now_kst + timedelta(days=1)).replace(hour=17, minute=30, second=0, microsecond=0)
    return t.strftime("%Y-%m-%d 17:30 KST")

# ─────────────────────────────────────────────
# 환율
# ─────────────────────────────────────────────
def get_usd_krw() -> float:
    try:
        t = yf.Ticker("KRW=X")
        rate = getattr(t.fast_info, "last_price", None)
        if rate and 1000 < rate < 2000:
            return float(rate)
    except Exception:
        pass
    return DEFAULT_USD_KRW

def format_krw(usd_str: str, usd_krw: float) -> str:
    try:
        m = re.match(r'\$?([\d.]+)([TBM]?)', usd_str.replace(",", ""))
        if not m:
            return ""
        num, unit = float(m.group(1)), m.group(2)
        usd = num * {"T": 1e12, "B": 1e9, "M": 1e6}.get(unit, 1)
        krw = usd * usd_krw
        if krw >= 1e12:
            return f"약 {krw/1e12:.1f}조원"
        if krw >= 1e8:
            return f"약 {krw/1e8:.0f}억원"
        return f"약 {krw/1e4:.0f}만원"
    except Exception:
        return ""

# ─────────────────────────────────────────────
# 1단계: 토스증권 크롤링 (Selenium + 스크롤)
# ─────────────────────────────────────────────
def fetch_toss_data():
    print("[1/3] 토스증권 해외주식 거래대금 상위 수집 중 (Selenium)...")

    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
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
        print("  페이지 로딩 중 (12초)...")
        time.sleep(12)

        # "거래대금" 탭 클릭 시도
        try:
            btns = driver.find_elements(By.XPATH, "//button[@role='radio'] | //button[contains(@class,'tab')]")
            for btn in btns:
                txt = btn.text.strip()
                if txt in ("거래대금", "토스증권 거래대금"):
                    btn.click()
                    print(f"  '{txt}' 탭 클릭")
                    time.sleep(4)
                    break
        except Exception as e:
            print(f"  탭 클릭 스킵: {e}")

        # ── 핵심: 스크롤 내려 100개 전체 로딩 ──
        print("  리스트 전체 로딩을 위해 스크롤 중...")
        last_count = 0
        for scroll_try in range(20):
            # 현재 페이지에서 종목 수 파악
            html_tmp = driver.page_source
            soup_tmp = __import__('bs4').BeautifulSoup(html_tmp, "html.parser")
            text_tmp = soup_tmp.get_text(separator="\n", strip=True)
            lines_tmp = [l.strip() for l in text_tmp.split("\n") if l.strip()]
            cur_stocks = parse_toss_lines(lines_tmp)
            cur_count = len(cur_stocks)
            print(f"    스크롤 {scroll_try+1}: {cur_count}개 감지")
            if cur_count >= TOP_N:
                print(f"  ✓ {TOP_N}개 달성")
                break
            if cur_count == last_count and scroll_try > 3:
                print(f"  더 이상 증가 없음 ({cur_count}개에서 멈춤)")
                break
            last_count = cur_count
            # 페이지 맨 아래로 스크롤
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            # 리스트 컨테이너 아래로도 스크롤
            try:
                list_el = driver.find_element(By.XPATH, "//ul[contains(@class,'list')] | //div[contains(@class,'chart')]")
                driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", list_el)
            except Exception:
                pass
            time.sleep(1)

        html = driver.page_source
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        lines = [l.strip() for l in soup.get_text(separator="\n", strip=True).split("\n") if l.strip()]
        stocks = parse_toss_lines(lines)

    except Exception as e:
        print(f"  [오류] 크롤링 실패: {e}")
    finally:
        if driver:
            driver.quit()

    print(f"  → {len(stocks)}개 종목 수집 완료")
    return stocks


def parse_toss_lines(lines):
    """
    토스증권 텍스트에서 종목 파싱.
    각 종목 행 구조:
      [순위숫자]
      [종목명]
      [티커배지 — 대문자+숫자 1~7자, 있을 수도 없을 수도]
      [가격]
      [등락률]
      [거래대금]
    """
    stocks = []
    start_idx = 0
    for idx, line in enumerate(lines):
        if ("순위" in line or "순위·" in line) and "기준" in line:
            start_idx = idx + 4
            break

    i = start_idx
    rank = 1
    max_rank = TOP_N + 10

    TICKER_RE = re.compile(r'^[A-Z][A-Z0-9]{0,6}$')   # 티커 패턴: 대문자로 시작, 최대 7자

    while i < len(lines) and rank <= max_rank:
        line = lines[i].strip()
        if line.isdigit() and int(line) == rank:
            try:
                name = lines[i + 1].strip()

                # ── 티커 배지 감지 ──────────────────────────────
                # 종목명 바로 다음 줄이 티커 패턴이면 캡처, 아니면 티커 없음
                candidate = lines[i + 2].strip() if i + 2 < len(lines) else ""
                if TICKER_RE.match(candidate):
                    toss_ticker = candidate
                    off = 1   # 티커 줄 있음 → 나머지 필드 +1 이동
                else:
                    toss_ticker = ""
                    off = 0

                price_raw  = lines[i + 2 + off].strip()
                change_raw = lines[i + 3 + off].strip()
                volume_raw = lines[i + 4 + off].strip()

                # 가격·등락률·거래대금 검증 (티커 감지 오류 방지)
                if not re.search(r'%', change_raw):
                    # change_raw가 % 없으면 off 추정 틀림 → 재시도
                    toss_ticker = ""
                    off = 0
                    price_raw  = lines[i + 2].strip()
                    change_raw = lines[i + 3].strip()
                    volume_raw = lines[i + 4].strip()

                change_match = re.search(r"([+-]?\d+\.?\d*)\s*%", change_raw)
                change_pct = float(change_match.group(1)) if change_match else 0.0

                vol_match = re.search(r"([\d,]+(?:\.\d+)?)\s*(억|조|만)?원", volume_raw)
                vol_num = 0.0
                if vol_match:
                    vol_num = float(vol_match.group(1).replace(",", ""))
                    unit = vol_match.group(2) or ""
                    if unit == "조":   vol_num *= 10000
                    elif unit == "만": vol_num /= 10000

                print(f"  파싱 {rank:>3}위: {name} [{toss_ticker or '티커없음'}] {change_pct:+.1f}%")
                stocks.append({
                    "rank": rank,
                    "name": name,
                    "toss_ticker": toss_ticker,   # ← 토스에서 직접 긁은 티커
                    "price": price_raw,
                    "change_pct": change_pct,
                    "volume": volume_raw,
                    "volume_num": vol_num,
                })
                rank += 1
                i += 5 + off
                continue
            except (IndexError, ValueError):
                pass
        i += 1

    return stocks[:TOP_N]


# ─────────────────────────────────────────────
# 2단계: 급등 필터링
# ─────────────────────────────────────────────
def filter_surge(stocks):
    print(f"[2/3] {SURGE_THRESHOLD}% 이상 급등 개별종목 필터링 중...")
    surged, excluded = [], 0
    for s in stocks:
        if s["change_pct"] < SURGE_THRESHOLD:
            continue
        ticker = get_ticker(s["name"]) or s["name"]
        if is_etf_or_leverage(s["name"], ticker):
            print(f"  [ETF/레버리지 제외] {s['name']} ({ticker})")
            excluded += 1
            continue
        surged.append(s)
    print(f"  → {len(surged)}개 급등 개별종목 (ETF/레버리지 {excluded}개 제외)")
    return surged


# ─────────────────────────────────────────────
# 3단계: Yahoo Finance 상세 정보
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
    "로켓 랩": "RKLB", "아이온큐": "IONQ",
    "리게티 컴퓨팅": "RGTI",          # ← ETF 아님, 양자컴퓨터 개별주
    "디 웨이브 퀀텀": "QBTS",
    "AST 스페이스모바일": "ASTS",
    "코인베이스": "COIN", "로빈후드": "HOOD", "스트래티지": "MSTR",
    "알리바바(ADR)": "BABA", "푸투 홀딩스(ADR)": "FUTU",
    "샌디스크": "SNDK", "웨스턴 디지털": "WDC", "델 테크놀로지스": "DELL",
    "세레브라스 시스템즈": "CBRS", "코어위브": "CRWV",
    "글로벌파운드리스": "GFS", "나비타스 세미컨덕터": "NVTS",
    "아이렌": "AIXI", "인플렉션": "INFN", "루멘텀 홀딩스": "LITE",
    "블룸 에너지": "BE", "코히런트": "COHR",
    "크리도 테크놀로지 그룹 홀딩": "CRDO",
    "AXT": "AXTI", "ASE 테크놀로지 홀딩(ADR)": "ASX",
    "TTM 테크놀로지스": "TTMI", "비스트라 에너지": "VST",
    "레드와이어": "RDW", "네비우스 그룹": "NBIS",
    "어플라이드 옵토일렉트로닉스": "AAOI", "노키아(ADR)": "NOK",
    "소파이 테크놀로지스": "SOFI", "플렉스": "FLEX",
    "에코스타": "SATS", "써클 인터넷 그룹": "CRCL",
    "베리사인": "VRSN", "펨비나 파이프라인": "PBA",
    "아카리 테라퓨틱스(ADR)": "ACRS", "아카리 테라퓨틱스": "ACRS",
    "삼성전자": "005930.KS", "SK하이닉스": "000660.KS",
    "스위트그린": "SG", "맥스리니어": "MXL",
    "캘러보 그로우아스": "CALB",
    "팸비나 파이프라인": "PPL.TO",
    # ── 추가 티커 ──
    "하모닉": "HLIT",
    "하일리온 홀딩스": "HYLN",
    "ASTX": "ASTX",
    "피코세라(ADR)": "PCLA",
    "피코세라": "PCLA",
    "HP": "HPQ",
    "HP 인크": "HPQ",
    "버텍스 파마슈티컬스": "VRTX",
    "넥스트라 에너지": "NEE",
    "사운드하운드 AI": "SOUN",
    "허닝웰 인터내셔널": "HON",
    "아너스트 컴퍼니": "HNST",
    "레이도스 홀딩스": "LDOS",
    "웰스파고": "WFC",
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

def search_ticker_yahoo(name: str) -> str | None:
    """종목명으로 야후 파이낸스 검색 API에서 티커 자동 조회"""
    try:
        import urllib.request, urllib.parse, json as _json
        query = urllib.parse.quote(name)
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=3&newsCount=0&enableFuzzyQuery=false"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = _json.loads(resp.read())
        quotes = data.get("finance", {}).get("result", [{}])[0].get("quotes", [])
        # 주식(EQUITY) 타입만 선택
        for q in quotes:
            if q.get("quoteType") == "EQUITY":
                sym = q.get("symbol", "")
                if sym:
                    print(f"    [야후 검색] '{name}' → {sym} ({q.get('shortname', '')})")
                    return sym
    except Exception as e:
        print(f"    [야후 검색 실패] {name}: {e}")
    return None


def get_ticker(name):
    if name in TICKER_MAP:
        return TICKER_MAP[name]
    # 이미 영문 티커 형식이면 그대로 반환
    if re.match(r'^[A-Z0-9.]{1,6}$', name):
        return name
    # TICKER_MAP에 없는 한글 종목명 → 야후 파이낸스 검색으로 자동 조회
    return search_ticker_yahoo(name)

# city 이름으로 국가 추정 (country 필드가 비어있을 때 보조)
CITY_TO_COUNTRY = {
    "tokyo": "일본", "osaka": "일본", "kyoto": "일본", "nagoya": "일본",
    "yokohama": "일본", "sapporo": "일본", "fukuoka": "일본",
    "beijing": "중국", "shanghai": "중국", "shenzhen": "중국",
    "guangzhou": "중국", "hangzhou": "중국", "nanjing": "중국",
    "hong kong": "홍콩",
    "seoul": "한국", "busan": "한국", "incheon": "한국",
    "taipei": "대만", "hsinchu": "대만", "tainan": "대만",
    "singapore": "싱가포르",
    "amsterdam": "네덜란드", "eindhoven": "네덜란드",
    "london": "영국", "cambridge": "영국", "oxford": "영국",
    "tel aviv": "이스라엘", "herzliya": "이스라엘", "petah tikva": "이스라엘",
    "toronto": "캐나다", "montreal": "캐나다", "vancouver": "캐나다",
    "stockholm": "스웨덴", "gothenburg": "스웨덴",
    "berlin": "독일", "munich": "독일", "hamburg": "독일",
    "paris": "프랑스", "lyon": "프랑스",
    "sydney": "호주", "melbourne": "호주",
    "bangalore": "인도", "mumbai": "인도", "hyderabad": "인도",
    "sao paulo": "브라질", "brasilia": "브라질",
    "dublin": "아일랜드",
    "george town": "케이맨 제도", "hamilton": "버뮤다",
}

def fetch_yahoo_info(ticker, usd_krw):
    try:
        t = yf.Ticker(ticker)
        info = t.info
        if not info or info.get("trailingPegRatio") is None and not info.get("shortName"):
            return None
        # ── 국가 결정: country 필드 → city 보조 순 ──────────────────
        country_en = info.get("country", "")
        country = COUNTRY_KO.get(country_en, country_en)
        if not country:
            city = (info.get("city") or "").lower().strip()
            country = CITY_TO_COUNTRY.get(city, "정보 없음")
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
            if mkt_cap >= 1e12:
                mkt_cap_str = f"${mkt_cap/1e12:.1f}T"
            elif mkt_cap >= 1e9:
                mkt_cap_str = f"${mkt_cap/1e9:.1f}B"
            else:
                mkt_cap_str = f"${mkt_cap/1e6:.0f}M"
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
            "country": country, "country_en": country_en, "ceo": ceo,
            "market_cap": mkt_cap_str, "market_cap_krw": mkt_cap_krw,
            "sector": info.get("sector", "정보 없음"),
            "industry": info.get("industry", "정보 없음"),
            "business_summary": (info.get("longBusinessSummary", "") or "")[:200],
            "short_interest": short_str, "short_interest_source": "fintel.io",
            "website": info.get("website", ""), "exchange": info.get("exchange", ""),
        }
    except Exception as e:
        print(f"  [경고] {ticker} 조회 실패: {e}")
        return None

def enrich_with_yahoo(stocks, usd_krw):
    print("[3/3] Yahoo Finance 상세 정보 수집 중...")
    enriched = []
    for stock in stocks:
        # 티커 우선순위: ① 토스에서 직접 긁은 티커 → ② TICKER_MAP → ③ 야후 자동검색
        toss_ticker = stock.get("toss_ticker", "")
        ticker = toss_ticker or get_ticker(stock["name"])
        source_label = "[토스]" if toss_ticker else ("[맵]" if stock["name"] in TICKER_MAP else "[검색]")

        detail = {}
        if ticker:
            print(f"  → {stock['name']} ({ticker}) {source_label} 조회 중...")
            detail = fetch_yahoo_info(ticker, usd_krw) or {}
            time.sleep(0.5)
        else:
            print(f"  → {stock['name']} 티커 미발견")
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
# 메인
# ─────────────────────────────────────────────
def main():
    now_kst = datetime.now(KST)
    print(f"=== 급등주주의보 데이터 수집 시작 ({now_kst.strftime('%Y-%m-%d %H:%M KST')}) ===")

    if should_skip_update():
        print("[건너뜀] 토 17:30 ~ 일 21:00 KST 구간은 업데이트하지 않습니다.")
        return

    print("  환율 조회 중...")
    usd_krw = get_usd_krw()
    print(f"  USD/KRW: {usd_krw:.1f}")

    nxt = next_update_str(now_kst)

    all_stocks = fetch_toss_data()
    if not all_stocks:
        print("[경고] 토스증권 데이터 수집 실패. 빈 결과로 저장합니다.")

    surged = filter_surge(all_stocks)
    enriched = enrich_with_yahoo(surged, usd_krw) if surged else []

    output = {
        "updated_at": now_kst.strftime("%Y-%m-%d %H:%M KST"),
        "updated_at_iso": now_kst.isoformat(),
        "next_update": nxt,
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
    public_path = os.path.normpath(
        os.path.join(os.path.dirname(OUTPUT_PATH), "..", "client", "public", "data", "stocks.json")
    )
    if os.path.exists(os.path.dirname(public_path)):
        import shutil
        shutil.copy2(OUTPUT_PATH, public_path)
        print("  → public 폴더에도 복사 완료")

    print(f"\n✅ 완료! {len(enriched)}개 급등 종목 → {OUTPUT_PATH}")
    for s in enriched:
        print(f"  {s['rank']:>3}위 {s['name']:<30} {s['change_pct']:+.2f}% {s['volume']} [{s.get('country','?')}]")
    if not enriched:
        print("  현재 급등 개별종목 없음")


if __name__ == "__main__":
    main()
