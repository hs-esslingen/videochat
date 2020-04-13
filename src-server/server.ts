import * as dotenv from "dotenv";
dotenv.config();
import * as express from "express";
import { Api } from "./api";
import { join } from "path";
import * as WebSocket from "ws";
import * as http from "http";
import * as passport from "passport";
import * as saml from "passport-saml";
import * as session from "express-session";
import { readFileSync } from "fs";
import * as bodyParser from "body-parser";

// Express server
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

const wss = new WebSocket.Server({ server: server, path: "/ws" }, () => {
  console.log("websocket opened");
});

wss.on("error", (err) => {
  console.error(err);
});

let samlStrategy: saml.Strategy;
if (!process.env.DEBUG) {
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

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
      return done(null, profile);
    }
  );

  passport.use(samlStrategy);
}

const api = new Api(wss);
// bodyParser is definitely not deprecated
// tslint:disable-next-line
app.use(bodyParser.json());
// bodyParser is definitely not deprecated
// tslint:disable-next-line
app.use(bodyParser.urlencoded({ extended: false }));

if (!process.env.DEBUG) {
  app.use(session({ secret: process.env.SESSION_SECRET }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get(
    "/login/sso",
    passport.authenticate("saml", { failureRedirect: "/login/fail" }),
    (req, res) => {
      res.redirect("/login/check-sso");
    }
  );

  app.post(
    "/login/callback",
    passport.authenticate("saml", { failureRedirect: "/login/fail" }),
    (req, res) => {
      console.log(req.isAuthenticated());
      res.json(req.isAuthenticated());
    }
  );

  app.get("/login/fail", (req, res) => {
    res.status(401).send("Login failed");
  });

  app.get("/Shibboleth.sso/Metadata", (req, res) => {
    const cert = readFileSync(__dirname + "/cert/cert.pem", "utf8");
    const metadata = samlStrategy.generateServiceProviderMetadata(
      cert,
      cert
    );
    res.type("application/xml");
    res
      .status(200)
      .send(
        metadata
      );
  });

  app.get("/login/check-sso", (req, res) => {
    if (req.isAuthenticated()) res.json({ token: "asdasd" });
    else res.redirect("/login/sso");
  });
} else {
  app.get("/login/check-sso", (req, res) => {
    res.send("SSO login is disabled in DEBUG mode");
  });
}

app.get("/login/check", (req, res) => {
  if (req.isAuthenticated()) res.json({ token: "asdasd" });
  else res.status(401).send("Unauthorized");
});

app.get("/login/logout", (req, res) => {
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
