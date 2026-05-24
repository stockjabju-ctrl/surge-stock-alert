# 🚀 급등주주의보 배포 가이드 (비개발자용)

이 가이드를 순서대로 따라하면 **약 15분** 안에 완전히 자동화된 서비스를 무료로 배포할 수 있습니다.

---

## ✅ 사전 준비

- [x] Github 계정 (github.com)
- [x] Vercel 계정 (vercel.com — Github으로 로그인)

---

## STEP 1. Github에 코드 올리기

### 1-1. Github에서 새 레포지토리 만들기

1. [github.com/new](https://github.com/new) 접속
2. **Repository name**: `surge-stock-alert`
3. **Public** 선택 (무료 Github Actions 사용을 위해 필수)
4. **Create repository** 클릭

### 1-2. 코드 업로드

Github 페이지에서 **"uploading an existing file"** 링크를 클릭하거나,
마누스에서 다운로드한 ZIP 파일을 압축 해제 후 폴더 전체를 드래그앤드롭으로 업로드합니다.

> 💡 **더 쉬운 방법**: Github Desktop 앱을 사용하면 드래그앤드롭으로 간단히 업로드 가능합니다.
> [desktop.github.com](https://desktop.github.com) 에서 무료 다운로드

---

## STEP 2. Vercel에 배포하기

1. [vercel.com](https://vercel.com) 접속 → **Add New... → Project**
2. **Import Git Repository** 에서 `surge-stock-alert` 선택
3. 설정 확인:
   - **Framework Preset**: `Vite`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`
4. **Deploy** 클릭
5. 약 1~2분 후 배포 완료 → `surge-stock-alert.vercel.app` 주소 생성

---

## STEP 3. 자동 업데이트 확인

배포 후 Github 레포지토리에서:

1. **Actions** 탭 클릭
2. **급등주 데이터 자동 업데이트** 워크플로우 클릭
3. **Run workflow** 버튼으로 수동 테스트 실행

> ✅ 성공하면 매일 **05:30 KST**, **11:00 KST** (평일)에 자동으로 데이터가 업데이트되고 Vercel이 자동 재배포합니다.

---

## STEP 4. 검색 등록 (SEO)

### 구글 검색 등록

1. [search.google.com/search-console](https://search.google.com/search-console) 접속
2. **URL 접두어** 방식으로 내 Vercel 주소 입력
3. HTML 파일 인증 방법 선택 → 파일 다운로드
4. 다운로드한 파일을 `client/public/` 폴더에 추가 후 Github에 업로드
5. Google Search Console에서 **확인** 클릭
6. **URL 검사 → 색인 생성 요청**

### 네이버 검색 등록

1. [searchadvisor.naver.com](https://searchadvisor.naver.com) 접속
2. **사이트 등록** → 내 Vercel 주소 입력
3. HTML 태그 인증 방법 선택 → 태그 복사
4. `client/index.html` 의 `<head>` 안에 붙여넣기 후 Github에 업로드
5. **확인** 클릭

> 📅 검색 노출까지는 보통 **1~2주** 소요됩니다.

---

## STEP 5. 커스텀 도메인 연결 (선택사항)

`급등주주의보.com` 같은 도메인을 구매하면 더 전문적으로 보입니다.

1. [가비아](https://www.gabia.com) 또는 [후이즈](https://www.whois.co.kr) 에서 도메인 구매 (연 1~2만원)
2. Vercel 프로젝트 → **Settings → Domains** → 도메인 추가
3. 가비아/후이즈 DNS 설정에서 Vercel이 알려주는 값 입력

---

## 🔄 데이터 업데이트 흐름 (자동)

```
매일 05:30 / 11:00 KST
        ↓
Github Actions 서버 자동 실행
        ↓
Python 스크립트 실행
  → 토스증권 크롤링 (거래대금 상위 100개)
  → 20% 이상 급등 종목 필터링
  → Yahoo Finance 상세 정보 수집
  → stocks.json 파일 업데이트
        ↓
Github에 자동 커밋 & 푸시
        ↓
Vercel이 변경 감지 → 자동 재배포 (약 30초)
        ↓
사용자가 웹사이트 접속 시 최신 데이터 확인
```

---

## ❓ 자주 묻는 질문

**Q. 비용이 얼마나 드나요?**
A. Github (무료) + Vercel (무료) = **완전 무료**. 도메인 구매 시 연 1~2만원 추가.

**Q. 데이터가 업데이트 안 되면 어떻게 하나요?**
A. Github → Actions 탭에서 워크플로우 실행 로그를 확인하세요. 토스증권 사이트 구조가 변경된 경우 스크립트 수정이 필요할 수 있습니다.

**Q. 급등 종목이 없으면 어떻게 표시되나요?**
A. "현재 급등 종목 없음" 안내 화면이 표시됩니다.

**Q. 모바일 홈 화면에 어떻게 추가하나요?**
A. 모바일 브라우저로 사이트 접속 → 하단 "홈 화면에 추가" 팝업 또는 브라우저 공유 버튼 → "홈 화면에 추가" 선택
