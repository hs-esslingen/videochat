import {getLogger} from 'log4js';
import * as passport from 'passport';
import * as express from 'express';
import * as OAuth2Strategy from 'passport-oauth2';
import {VerifyCallback} from 'passport-oauth2';

export const logger = getLogger('blackboard');

export function setupBlackboard(app: express.Application) {
  const oauthStrategy = new OAuth2Strategy(
    {
      authorizationURL: 'https://gannon.blackboard.com/learn/api/public/v1/oauth2/authorizationcode',
      tokenURL: 'https://gannon.blackboard.com/learn/api/public/v1/oauth2/token',
      clientID: process.env.OAUTH_CLIENT_ID as string,
      clientSecret: process.env.OAUTH_CLIENT_SECRET as string,
      callbackURL: process.env.CALLBACK_URL,
      scope: 'read',
    },
    (accessToken: string, refreshToken: string, profile: OAuth2Strategy.Metadata, done: VerifyCallback) => {
      logger.debug('Parsing', profile);
      const user = {
        accessToken,
        refreshToken,
        displayName: 'User',
        email: 'user@test.de',
      };

      //TODO: Get User Email and DisplayName
      return done(null, user);
    }
  );
  passport.use(oauthStrategy);

  app.get('/auth/sso', passport.authenticate('oauth2', {failureRedirect: '/auth/fail'}), (req, res) => {
    res.redirect('/auth/check-sso');
  });

  app.post('/auth/callback', passport.authenticate('oauth2', {failureRedirect: '/auth/fail'}), (req, res) => {
    logger.info('SSO Login', req.user);

    res.send(`<html>
          <head>
            <title>SSO Login Callback</title>
          </head>
          <body>
            <p>Please close this Window!</p>
            <script type="text/javascript">
              window.close();
            </script>
          </body>
          </html>`);
  });

  // Backwards compatibility to old metadata configuration
  app.post('/login/callback', passport.authenticate('saml', {failureRedirect: '/auth/fail'}), (req, res) => {
    logger.info('SSO Login', req.user);

    res.send(`<html>
          <head>
            <title>SSO Login Callback</title>
          </head>
          <body>
            <p>Please close this Window!</p>
            <script type="text/javascript">
              window.close();
            </script>
          </body>
          </html>`);
  });

  app.get('/auth/fail', (req, res) => {
    res.status(401).send('Login failed');
  });
}
