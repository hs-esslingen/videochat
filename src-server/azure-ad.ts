import * as express from 'express';
import {getLogger} from 'log4js';
import * as passport from 'passport';
import {IProfile, OIDCStrategy} from 'passport-azure-ad';
import {VerifiedCallback} from 'passport-saml';

const logger = getLogger('azure-ad');

export function setupAdLogin(app: express.Application) {
  passport.use(
    new OIDCStrategy(
      {
        identityMetadata: process.env.AD_METHADATA as string,
        clientID: process.env.AD_CLIENT_ID as string,
        responseType: 'code',
        responseMode: 'form_post',
        redirectUrl: process.env.CALLBACK_URL as string,
        allowHttpForRedirectUrl: true,
        clientSecret: process.env.AD_CLIENT_SECRET,
        validateIssuer: false,
        passReqToCallback: false,
        scope: ['profile', 'email'],
        loggingLevel: process.env.AD_LOG_LEVEL as 'info' | 'warn' | 'error',
      },
      async (iss: string, sub: string, profile: IProfile, accessToken: string, refreshToken: string, done: VerifiedCallback) => {
        if (!profile.oid) {
          return done(new Error('No oid found'), undefined);
        }
        logger.trace('Parsing User', profile);
        const user = {
          //@ts-ignore
          email: profile._json.email as string,
          scope: profile.oid,
          displayName: profile.displayName,
        };

        return done(null, user);
      }
    )
  );

  app.get(
    '/auth/sso',
    (req, res, next) => {
      passport.authenticate('azuread-openidconnect', {failureRedirect: '/auth/fail'})(req, res, next);
    },
    (req, res) => {
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
    }
  );

  app.post(
    '/auth/callback',
    passport.authenticate('azuread-openidconnect', {
      // response: res,                      // required
    }),
    (req, res) => {
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
    }
  );
  app.get('/auth/fail', (req, res) => {
    res.status(401).send('Login failed');
  });
}
