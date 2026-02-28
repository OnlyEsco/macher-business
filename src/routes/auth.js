import express from 'express';

const router = express.Router();

router.get('/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_CALLBACK_URL,
    response_type: 'code',
    scope: 'identify',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// Step 1: Receive code, send to frontend to complete exchange
router.get('/discord/callback', (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/?error=auth');
  // Pass code to frontend - frontend will call /auth/token
  res.redirect(`/?code=${encodeURIComponent(code)}`);
});

// Step 2: Frontend calls this with the code
router.post('/token', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Kein Code' });

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_CALLBACK_URL,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log('🔵 Token Status:', tokenRes.status, JSON.stringify(tokenData).substring(0, 100));

    if (!tokenRes.ok) {
      console.error('❌ Token Fehler:', JSON.stringify(tokenData));
      return res.status(400).json({ error: 'Token fehlgeschlagen', detail: tokenData });
    }

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const user = await userRes.json();
    console.log('✅ User:', user.username, user.id);

    req.session.user = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    };

    res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error('❌ Fehler:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

export default router;
