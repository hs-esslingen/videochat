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
import { getLogger, configure } from "log4js";
import { Email } from "./email";

export const logger = getLogger("server");
initLogger();

const email = new Email();

// Express server
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

const wss = new WebSocket.Server({ noServer: true });

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
    logger.debug("Parsing JWT", jwtPayload);
    done(null, jwtPayload);
  }
);

let samlStrategy: saml.Strategy;
if (process.env.NODE_ENV === "production") {
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
      logger.debug("Parsing SAML", profile);
      const user = {
        email: profile["urn:oid:0.9.2342.19200300.100.1.3"],
        scope: profile["urn:oid:1.3.6.1.4.1.5923.1.1.1.9"],
        displayName:
          profile["urn:oid:2.5.4.42"] + " " + profile["urn:oid:2.5.4.4"],
      };
      return done(null, user);
    }
  );
  passport.use(samlStrategy);
}
passport.use(jwtStrategy);

const api = new Api(wss);
const expressSession = session({ secret: process.env.SESSION_SECRET });
app.use(expressSession);
app.use(passport.initialize());
app.use(passport.session());

if (process.env.NODE_ENV === "production") {
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
      logger.info("SSO Login", req.user);

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

  // Backwards compatibility to old metadata configuration
  app.post(
    "/login/callback",
    passport.authenticate("saml", { failureRedirect: "/auth/fail" }),
    (req, res) => {
      logger.info("SSO Login", req.user);

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

app.get("/auth/moodle", (req, res) => {
  res.set("Content-Type", "text/html; charset=UTF-8");
  let token;
  const queryString: string = req.query.token;
  if (queryString) {
    const split = queryString.split("://token=");
    if (split.length > 1) {
      const b64 = split[1];
      const data = Buffer.from(b64, "base64").toString();
      const b64Split = data.split(":::");
      if (b64Split.length > 1) {
        token = b64Split[1];
      }
    }
  }
  res.send(`
<html>
  <head>
    <title>Moodle Callback</title>
  </head>
  <body>
    <h1>Please close this Window!</h1>
    <script type="text/javascript">
      window.localStorage.setItem("moodleToken", "${token}");
      window.close();
    </script>
  </body>
</html>
  `);
});

app.get("/auth/jwt", passport.authenticate("jwt"), (req, res) => {
  logger.info("JWT Login", req.user);
  res.status(204).send();
});

app.post("/auth/email", (req, res) => {
  logger.trace("/auth/email");
  const secretkey = "mysecretkey";

  const EmailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (
    req.body.email !== undefined &&
    EmailRegExp.test(req.body.email) &&
    req.body.email.endsWith("hs-esslingen.de")
  ) {
    const token = jwt.sign({ email: req.body.email }, secretkey);
    logger.info("email is valid: ", req.body.email);
    // send encoded token
    res.json({
      token,
    });

    const callbackUrl =
      "https://hse-chat.app/login/email?token=" + escape(token);

    email.sendMail(
      req.body.email,
      req.body.email,
      "Hochschule Esslingen Chat Login",
      "",
      `
      <style>
      a {
        padding: 8px;
        text-aling: center;
        color: white;
        background-color: #193058;
        display: inline-block;
        text-decoration: none;
      }
      </style>
      <h1>Willkommen zum Online Videochat der Hochschule Esslingen</h1>
	  <p>Klicken Sie auf den Login Link um ein Videochat Room zu betreten:</p>
      <a href="${callbackUrl}">Login</a>
	  <p>Wenn Sie sich nicht beim Online Videochat der Hochschule Esslingen angemeldet haben, ignorieren Sie diese Email.</p>
      `
    );
  } else {
    const error = "email is invalid";
    logger.error(error, req.body.email);
    res.status(400).send(error);
  }
});

app.get("/auth/check", (req, res) => {
  // @ts-ignore email exists exists in user
  if (req.isAuthenticated()) res.json({ email: req.user.email, displayName: req.user.displayName || req.user.email.split("@")[0] });
  else res.status(401).send("Unauthorized");
});

app.get("/auth/logout", (req, res) => {
  req.logout();
  res.status(204).send();
});

app.get("/ws", (req, res) => {
  wss.handleUpgrade(req, res.socket, Buffer.from(""), (ws: MyWebSocket) => {
    ws.sessionID = req.sessionID;
    ws.user = req.user;
    wss.emit("connection", ws);
  });
});

app.use("/api", (req, res, next) => {
  if (req.isAuthenticated()) next();
  else res.status(401).send("Unauthorized");
});

app.use("/api", api.getApi());

app.use("/", express.static(join(__dirname, "./browser")));

app.use("*", (req, res) => {
  res.sendFile(join(__dirname, "./browser/index.html"));
});

wss.on("connection", function connection(ws: MyWebSocket) {
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));
});

const interval = setInterval(function ping() {
  if (wss.clients)
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
  logger.info(`Node Express server listening on http://0.0.0.0:${PORT}`);
});

export interface MyWebSocket extends WebSocket {
  isAlive: boolean;
  sessionID: string;
  user: any;
}

function initLogger(): void {
  // set log level via environment variable (default is info)
  logger.level = process.env.LOGLEVEL || "info";
  const logconf: any = {
    appenders: {
      stdout: { type: "stdout" },
    },
    categories: {
      default: { appenders: ["stdout"], level: logger.level },
    },
  };

  if (process.env.LOGFILE && process.env.LOGFILE.endsWith(".log")) {
    // write logs to log file
    logconf.appenders.file = {
      type: "file",
      filename: process.env.LOGFILE,
      // log size in bytes for log rolling
      maxLogSize: 10485760,
      // number of files for log rolling
      backups: 3,
    };
    logconf.categories.default = {
      appenders: ["file", "stdout"],
      level: logger.level,
    };
  }

  // configure log4js
  configure(logconf);
}
