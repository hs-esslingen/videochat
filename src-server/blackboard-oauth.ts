import {getLogger} from 'log4js';
import * as passport from 'passport';
import * as express from 'express';
import * as OAuth2Strategy from 'passport-oauth2';
import {VerifyCallback} from 'passport-oauth2';
import fetch from 'node-fetch';

export const logger = getLogger('blackboard');

export function setupBlackboard(app: express.Application) {
  const oauthStrategy = new OAuth2Strategy(
    {
      authorizationURL: process.env.OAUTH_URL + '/learn/api/public/v1/oauth2/authorizationcode',
      tokenURL: process.env.OAUTH_URL + '/learn/api/public/v1/oauth2/token',
      clientID: process.env.OAUTH_CLIENT_ID as string,
      clientSecret: process.env.OAUTH_CLIENT_SECRET as string,
      customHeaders: {
        Authorization: 'Basic ' + Buffer.from(process.env.OAUTH_CLIENT_ID + ':' + process.env.OAUTH_CLIENT_SECRET).toString('base64'),
      },

      pkce: false,
      callbackURL: process.env.CALLBACK_URL,
      scope: 'read',
    },
    async (accessToken: string, refreshToken: string, profile: OAuth2Strategy.Metadata, done: VerifyCallback) => {
      logger.debug('Parsing', profile);
      const user = {
        accessToken,
        refreshToken,
        displayName: 'User',
        email: 'unknown@test.de',
      };
      console.log(accessToken);
      console.log(profile);
      const request = await fetch(process.env.OAUTH_URL + '/learn/api/public/v1/users', {
        headers: {Authorization: 'Bearer ' + accessToken},
      });

      const data = await request.json();
      if (data.results?.length >= 1) {
        user.displayName = data.results[0].name.given + ' ' + data.results[0].name.family;
        user.email = data.results[0].userName + '@gannon.edu';
      }
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

  app.get('/auth/callback', passport.authenticate('oauth2', {failureRedirect: '/auth/fail'}), (req, res) => {
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
