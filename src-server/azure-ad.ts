import * as express from "express";
import * as passport from 'passport';
import { IProfile, OIDCStrategy } from 'passport-azure-ad';
import { VerifiedCallback } from 'passport-saml';

export function setupAdLogin(app: express.Application) {
    passport.use(new OIDCStrategy({
        // identityMetadata: 'https://login.microsoftonline.com/c9515ae6-7419-4ae5-a700-4bb5f4afa7dc/v2.0/.well-known/openid-configuration',
        identityMetadata: 'https://login.microsoftonline.com/46f80e04-bb49-4a3a-8e2a-6d4538c0df36/v2.0/.well-known/openid-configuration',
        clientID: 'f3f76609-46b8-4877-8289-da0895762da5',
        responseType: 'code',
        responseMode: 'form_post',
        redirectUrl: process.env.CALLBACK_URL!,
        allowHttpForRedirectUrl: true,
        clientSecret: 'VhS_skO~8_gt1d~..faNe6di7Ws09tBffn',
        validateIssuer: false,
        // isB2C: config.creds.isB2C,
        // issuer: config.creds.issuer, 
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
                return done(new Error("No oid found"), undefined);
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
                    email: profile.emails[0],
                    scope: profile.oid,
                    displayName: profile.displayName,
                };
                return done(null, user);
                // });
            });
        }
    ));


    app.get('/auth/sso',
        function (req, res, next) {
            passport.authenticate('azuread-openidconnect',
                {

                    // response: res,                      // required
                    // resourceURL: config.resourceURL,    // optional. Provide a value if you want to specify the resource.
                    // customState: 'my_state',            // optional. Provide a value if you want to provide custom state value.
                    failureRedirect: '/'
                }
            )(req, res, next);
        },
        function (req, res) {
            res.redirect('/');
        });


    app.get('/auth/callback',
        function (req, res, next) {
            passport.authenticate('azuread-openidconnect',
                {
                    // response: res,                      // required
                    failureRedirect: '/'
                }
            )(req, res, next);
        },
        function (req, res) {
            res.redirect('/auth/check-sso');

        });

    app.post('/auth/callback',
        function (req, res, next) {
            passport.authenticate('azuread-openidconnect',
                {
                    // response: res,                      // required
                    failureRedirect: '/'
                }
            )(req, res, next);
        },
        function (req, res) {
            res.redirect('/auth/check-sso');

        });

}