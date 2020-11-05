import * as saml from 'passport-saml';
import {readFileSync} from 'fs';
import {getLogger} from 'log4js';
import * as passport from 'passport';
import * as express from 'express';

export const logger = getLogger('shibboleth');

export function setupShibboleth(app: express.Application) {
  const samlStrategy = new saml.Strategy(
    {
      callbackUrl: process.env.CALLBACK_URL,
      entryPoint: process.env.ENTRY_POINT,
      issuer: process.env.ISSUER,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      identifierFormat: (null as any) as undefined,
      decryptionPvk: readFileSync(__dirname + '/cert/key.pem', 'utf8'),
      privateCert: readFileSync(__dirname + '/cert/key.pem', 'utf8'),
      // IDP Public key
      cert: readFileSync(__dirname + '/cert/idp_cert.pem', 'utf8'),
      validateInResponseTo: false,
      disableRequestedAuthnContext: true,
    },
    (profile: saml.Profile, done: saml.VerifiedCallback) => {
      logger.debug('Parsing SAML', profile);
      const user = {
        email: profile['urn:oid:0.9.2342.19200300.100.1.3'],
        scope: profile['urn:oid:1.3.6.1.4.1.5923.1.1.1.9'],
        displayName: profile['urn:oid:2.5.4.42'] + ' ' + profile['urn:oid:2.5.4.4'],
      };
      return done(null, user);
    }
  );
  passport.use(samlStrategy);

  app.get('/auth/sso', passport.authenticate('saml', {failureRedirect: '/auth/fail'}), (req, res) => {
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

  app.post('/auth/callback', passport.authenticate('saml', {failureRedirect: '/auth/fail'}), (req, res) => {
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

  app.get('/Shibboleth.sso/Metadata', (req, res) => {
    const cert = readFileSync(__dirname + '/cert/cert.pem', 'utf8');
    const metadata = samlStrategy.generateServiceProviderMetadata(cert, cert);
    res.type('application/xml');
    res.status(200).send(metadata);
  });
}
