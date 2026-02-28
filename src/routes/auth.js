import express from 'express';
import passport from 'passport';

const router = express.Router();

router.get('/discord', (req, res, next) => {
  console.log('🔵 Discord Login gestartet...');
  console.log('🔵 CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? process.env.DISCORD_CLIENT_ID.substring(0,8) + '...' : 'FEHLT!');
  console.log('🔵 CLIENT_SECRET:', process.env.DISCORD_CLIENT_SECRET ? '✅ vorhanden (' + process.env.DISCORD_CLIENT_SECRET.length + ' Zeichen)' : '❌ FEHLT!');
  console.log('🔵 CALLBACK_URL:', process.env.DISCORD_CALLBACK_URL || '❌ FEHLT!');
  passport.authenticate('discord')(req, res, next);
});

router.get('/discord/callback', (req, res, next) => {
  console.log('🔵 Callback von Discord erhalten...');
  passport.authenticate('discord', (err, user, info) => {
    if (err) {
      console.error('❌ OAuth Fehler Typ:', err.constructor.name);
      console.error('❌ OAuth Fehler Message:', err.message);
      if (err.oauthError) {
        console.error('❌ OAuth Fehler Data:', JSON.stringify(err.oauthError));
      }
      return res.redirect('/?error=auth');
    }
    if (!user) {
      console.error('❌ Kein User. Info:', JSON.stringify(info));
      return res.redirect('/?error=auth');
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('❌ Login Fehler:', loginErr.message);
        return res.redirect('/?error=auth');
      }
      console.log('✅ Eingeloggt:', user.username, '| ID:', user.id);
      return res.redirect('/');
    });
  })(req, res, next);
});

router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

export default router;
