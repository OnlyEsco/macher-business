import express from 'express';

const router = express.Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_CALLBACK_URL = process.env.DISCORD_CALLBACK_URL;
const SCOPES = 'identify';

router.get('/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_CALLBACK_URL,
    response_type: 'code',
    scope: SCOPES,
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

router.get('/discord/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    console.error('❌ Discord callback error:', error);
    return res.redirect('/?error=auth');
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_CALLBACK_URL,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log('🔵 Token response status:', tokenRes.status);

    if (!tokenRes.ok) {
      console.error('❌ Token exchange failed:', JSON.stringify(tokenData));
      return res.redirect('/?error=auth');
    }

    // Get user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const user = await userRes.json();
    console.log('✅ Eingeloggt:', user.username, '| ID:', user.id);

    req.session.user = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      discriminator: user.discriminator,
    };

    res.redirect('/');
  } catch (err) {
    console.error('❌ Auth Fehler:', err.message);
    res.redirect('/?error=auth');
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

export default router;
