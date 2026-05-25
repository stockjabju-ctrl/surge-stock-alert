// ============================================================
// Vercel Cron Job 엔드포인트
// 실제 경로: 프로젝트 루트의 api/auto-cron.js
//
// Vercel이 설정된 스케줄에 따라 자동으로 이 함수를 호출합니다.
// Vercel은 호출 시 Authorization: Bearer {CRON_SECRET} 헤더를 붙여줍니다.
// ============================================================

module.exports = async function handler(req, res) {
  // Vercel Cron 인증 확인 (CRON_SECRET 환경변수로 검증)
  const authHeader = req.headers["authorization"];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const GITHUB_PAT = process.env.GITHUB_PAT;
  if (!GITHUB_PAT) {
    return res.status(500).json({ error: "GITHUB_PAT 환경변수 미설정" });
  }

  try {
    const ghRes = await fetch(
      "https://api.github.com/repos/stockjabju-ctrl/surge-stock-alert/actions/workflows/update-stocks.yml/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (ghRes.status === 204) {
      console.log(`[auto-cron] GitHub Actions 트리거 성공 ${new Date().toISOString()}`);
      return res.status(200).json({ ok: true, triggered_at: new Date().toISOString() });
    }

    const errText = await ghRes.text();
    return res.status(500).json({ error: `GitHub API 오류 (${ghRes.status}): ${errText}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
