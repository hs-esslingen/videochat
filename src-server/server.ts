import * as dotenv from "dotenv";
dotenv.config();
import * as express from "express";
import { Api } from "./api";
import { join } from "path";
import * as WebSocket from "ws";
import * as http from "http";
import * as passport from "passport";
import * as saml from "passport-saml";
import * as jwtPassport from "passport-jwt";
import * as jwt from "jsonwebtoken";
import * as session from "express-session";
import { readFileSync } from "fs";
import * as bodyParser from "body-parser";

// Express server
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

const wss = new WebSocket.Server({ server, path: "/ws" }, () => {
  console.log("websocket opened");
});

wss.on("error", (err) => {
  console.error(err);
});

// bodyParser is definitely not deprecated
// tslint:disable-next-line
app.use(bodyParser.json());
// bodyParser is definitely not deprecated
// tslint:disable-next-line
app.use(bodyParser.urlencoded({ extended: false }));


passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

const jwtStrategy = new jwtPassport.Strategy(
  {
    secretOrKey: "mysecretkey",
    jwtFromRequest: jwtPassport.ExtractJwt.fromHeader("x-token"),
  },
  (jwtPayload, done) => {
    console.log(jwtPayload);
    done(null, jwtPayload);
  }
);

let samlStrategy: saml.Strategy;
if (!process.env.DEBUG) {
  samlStrategy = new saml.Strategy(
    {
      callbackUrl: process.env.CALLBACK_URL,
      entryPoint: process.env.ENTRY_POINT,
      issuer: process.env.ISSUER,
      identifierFormat: null,
      decryptionPvk: readFileSync(__dirname + "/cert/key.pem", "utf8"),
      privateCert: readFileSync(__dirname + "/cert/key.pem", "utf8"),
      // IDP Public key
      cert: readFileSync(__dirname + "/cert/idp_cert.pem", "utf8"),
      validateInResponseTo: false,
      disableRequestedAuthnContext: true,
    },
    (profile, done) => {
      console.log(profile);
      return done(null, profile);
    }
  );
  passport.use(samlStrategy);
}
passport.use(jwtStrategy);

const api = new Api(wss);
app.use(session({ secret: process.env.SESSION_SECRET }));
app.use(passport.initialize());
app.use(passport.session());

if (!process.env.DEBUG) {
  app.get(
    "/auth/sso",
    passport.authenticate("saml", { failureRedirect: "/auth/fail" }),
    (req, res) => {
      res.redirect("/auth/check-sso");
    }
  );

  app.post(
    "/auth/callback",
    passport.authenticate("saml", { failureRedirect: "/auth/fail" }),
    (req, res) => {
      console.log(req.isAuthenticated());
      res.json(req.isAuthenticated());
    }
  );

  app.post(
    "/login/callback",
    passport.authenticate("saml", { failureRedirect: "/auth/fail" }),
    (req, res) => {
      console.log(req.isAuthenticated());
      res.json(req.isAuthenticated());
    }
  );

  app.get("/auth/fail", (req, res) => {
    res.status(401).send("Login failed");
  });

  app.get("/Shibboleth.sso/Metadata", (req, res) => {
    const cert = readFileSync(__dirname + "/cert/cert.pem", "utf8");
    const metadata = samlStrategy.generateServiceProviderMetadata(cert, cert);
    res.type("application/xml");
    res.status(200).send(metadata);
  });

  app.get("/auth/check-sso", (req, res) => {
    if (req.isAuthenticated()) res.json({ token: "asdasd" });
    else res.redirect("/auth/sso");
  });
} else {
  app.get("/auth/check-sso", (req, res) => {
    res.send("SSO login is disabled in DEBUG mode");
  });
}

app.get("/auth/jwt", passport.authenticate("jwt"), (req, res) => {
  res.status(201).send();
});

app.post("/auth/email", (req, res) => {
  const secretkey = "mysecretkey";

  const EmailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (
    req.body.email !== undefined &&
    EmailRegExp.test(req.body.email) &&
    req.body.email.endsWith("hs-esslingen.de")
  ) {
    const token = jwt.sign({ email: req.body.email }, secretkey);
    // send encoded token
    res.json({
      token,
    });
  } else {
    const error = "email is invalid";
    console.log(error);
    res.status(400).send(error);
  }
});

app.get("/auth/check", (req, res) => {
  console.log(req.user);
  if (req.isAuthenticated()) res.status(201).send();
  else res.status(401).send("Unauthorized");
});

app.get("/auth/logout", (req, res) => {
  req.logout();
  res.status(201).send();
});

app.use("/api", api.getApi());

app.use("/", express.static(join(__dirname, "./browser")));
app.use("*", (req, res) => {
  console.log(req.path);
  res.sendFile(join(__dirname, "./browser/index.html"));
});

wss.on("connection", function connection(ws: MyWebSocket) {
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws: MyWebSocket) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 10000);

wss.on("close", function close() {
  clearInterval(interval);
});

// Start up the Node server
server.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});

export interface MyWebSocket extends WebSocket {
  isAlive: boolean;
  transports: string[];
}
