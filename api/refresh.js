module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { password } = req.body || {};

    const REFRESH_PASSWORD = process.env.REFRESH_PASSWORD;
    const GITHUB_PAT = process.env.GITHUB_PAT;

    if (!REFRESH_PASSWORD || !GITHUB_PAT) {
      return res.status(500).json({
        error: "서버 환경변수 미설정. Vercel → Settings → Environment Variables 확인",
      });
    }

    if (!password || password !== REFRESH_PASSWORD) {
      return res.status(401).json({ error: "비밀번호가 틀렸습니다" });
    }

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
      return res.status(200).json({ ok: true });
    }

    const errText = await ghRes.text();
    return res.status(500).json({
      error: `GitHub API 오류 (${ghRes.status}): ${errText}`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
