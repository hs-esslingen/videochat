import * as express from 'express';
import * as passport from 'passport';
import {IProfile, OIDCStrategy} from 'passport-azure-ad';
import {VerifiedCallback} from 'passport-saml';

export function setupAdLogin(app: express.Application) {
  passport.use(
    new OIDCStrategy(
      {
        identityMetadata: process.env.AD_METHADATA as string,
        clientID: 'f3f76609-46b8-4877-8289-da0895762da5',
        responseType: 'code',
        responseMode: 'form_post',
        redirectUrl: process.env.CALLBACK_URL as string,
        allowHttpForRedirectUrl: true,
        clientSecret: process.env.AD_CLIENT_SECRET,
        validateIssuer: false,
        passReqToCallback: false,
        scope: ['profile'],
        loggingLevel: 'info',
        // nonceLifetime: config.creds.nonceLifetime,
        // nonceMaxAmount: config.creds.nonceMaxAmount,
        // useCookieInsteadOfSession: config.creds.useCookieInsteadOfSession,
        // cookieEncryptionKeys: config.creds.cookieEncryptionKeys,
        // clockSkew: config.creds.clockSkew,
      },
      (iss: string, sub: string, profile: IProfile, accessToken: string, refreshToken: string, done: VerifiedCallback) => {
        if (!profile.oid) {
          return done(new Error('No oid found'), undefined);
        }
        console.log(profile);
        // asynchronous verification, for effect...
        process.nextTick(() => {
          // findByOid(profile.oid, function (err, user) {
          //     if (err) {
          //         return done(err);
          //     }
          //     if (!user) {
          //         // "Auto-registration"
          //         users.push(profile);
          //         return done(null, profile);
          //     }

          const user = {
            email: profile.emails,
            scope: profile.oid,
            displayName: profile.displayName,
          };
          return done(null, user);
          // });
        });
      }
    )
  );

  app.get(
    '/auth/sso',
    (req, res, next) => {
      passport.authenticate('azuread-openidconnect', {
        // response: res,                      // required
        // resourceURL: config.resourceURL,    // optional. Provide a value if you want to specify the resource.
        // customState: 'my_state',            // optional. Provide a value if you want to provide custom state value.
        failureRedirect: '/',
      })(req, res, next);
    },
    (req, res) => {
      res.redirect('/');
    }
  );

  app.get(
    '/auth/callback',
    (req, res, next) => {
      passport.authenticate('azuread-openidconnect', {
        // response: res,                      // required
        failureRedirect: '/',
      })(req, res, next);
    },
    (req, res) => {
      res.redirect('/auth/check-sso');
    }
  );

  app.post(
    '/auth/callback',
    (req, res, next) => {
      passport.authenticate('azuread-openidconnect', {
        // response: res,                      // required
        failureRedirect: '/',
      })(req, res, next);
    },
    (req, res) => {
      res.redirect('/auth/check-sso');
    }
  );
}
