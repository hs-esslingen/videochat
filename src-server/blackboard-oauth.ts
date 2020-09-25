import * as saml from 'passport-saml';
import {readFileSync} from 'fs';
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
    (accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) => {
      logger.debug('Parsing', profile);
      const user = {
        accessToken,
        refreshToken,
        email: profile['urn:oid:0.9.2342.19200300.100.1.3'],
        scope: profile['urn:oid:1.3.6.1.4.1.5923.1.1.1.9'],
        displayName: profile['urn:oid:2.5.4.42'] + ' ' + profile['urn:oid:2.5.4.4'],
      };
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
