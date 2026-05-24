# 🚨 급등주주의보

> 토스증권 거래대금 상위 100개 종목 중 **20% 이상 급등한 종목**을 매일 자동으로 알려주는 무료 주식 알리미 서비스

---

## 📋 주요 기능

- **자동 업데이트**: 매일 05:30, 11:00 KST (평일 기준) Github Actions가 자동 실행
- **국가 필터**: 미국, 한국 등 국가별 필터링
- **자세히 모드**: 클릭 시 대표자, 시가총액, 섹터, 공매도 현황 등 상세 정보 표시
- **PWA 지원**: 모바일 홈 화면에 앱처럼 추가 가능 (iOS/Android 모두 지원)
- **SEO 최적화**: 구글/네이버 검색 등록 가능

---

## 🚀 배포 방법 (처음 1회만)

### 1단계: Github에 업로드

```bash
# Github에서 새 레포지토리 생성 후 (이름 예: surge-stock-alert)
git init
git add .
git commit -m "🚀 초기 배포"
git branch -M main
git remote add origin https://github.com/[내아이디]/surge-stock-alert.git
git push -u origin main
```

### 2단계: Vercel 연결

1. [vercel.com](https://vercel.com) 접속 → **Add New Project**
2. Github 레포지토리 선택 → **Import**
3. **Framework Preset**: Vite 선택
4. **Build Command**: `pnpm build`
5. **Output Directory**: `dist`
6. **Deploy** 클릭

### 3단계: 자동 업데이트 확인

- Github Actions 탭에서 `급등주 데이터 자동 업데이트` 워크플로우 확인
- **Actions → Run workflow** 버튼으로 수동 테스트 가능
- 매일 05:30, 11:00 KST에 자동 실행 → Vercel이 자동으로 재배포

---

## 📁 프로젝트 구조

```
surge-stock-alert/
├── .github/
│   └── workflows/
│       └── update-stocks.yml    ← 자동화 스케줄 설정
├── client/
│   ├── public/
│   │   ├── data/
│   │   │   └── stocks.json      ← 웹사이트가 읽는 데이터
│   │   └── manifest.json        ← PWA 설정
│   └── src/
│       └── pages/Home.tsx       ← 메인 페이지
├── data/
│   └── stocks.json              ← 스크립트가 저장하는 원본 데이터
├── scripts/
│   ├── fetch_data.py            ← 데이터 수집 스크립트
│   └── requirements.txt
└── README.md
```

---

## 🔧 로컬 실행 (개발용)

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 데이터 수동 수집 (Python 필요)
pip install -r scripts/requirements.txt
python scripts/fetch_data.py
```

---

## 📊 데이터 출처

- **종목 리스트**: 토스증권 (tossinvest.com) 거래대금 상위 100개 종목
- **상세 정보**: Yahoo Finance API (yfinance)

---

## ⚠️ 면책 조항

본 서비스는 투자 권유가 아닙니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
