import * as dotenv from 'dotenv';
dotenv.config();
import * as express from 'express';
import {Api} from './api';
import {join} from 'path';
import * as WebSocket from 'ws';
import * as http from 'http';
import * as passport from 'passport';
import * as jwtPassport from 'passport-jwt';
import * as jwt from 'jsonwebtoken';
import * as session from 'express-session';
import * as redis from 'redis';
import * as connectRedis from 'connect-redis';
import * as bodyParser from 'body-parser';
import {getLogger, configure, Configuration} from 'log4js';
import {setupShibboleth} from './shibboleth';
import {setupAdLogin} from './azure-ad';
import * as helmet from 'helmet';
import * as Negotiator from 'negotiator';
import {setupBlackboard} from './blackboard-oauth';
import {existsSync} from 'fs';

export const logger = getLogger('server');
initLogger();

// Express server
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const secretkey = process.env.SIGN_SECRETKEY || 'mysecretkey';
const availableLanguages = ['en', 'de'];
const fallbackLanguage = 'en';

const wss = new WebSocket.Server({noServer: true});

wss.on('error', err => {
  console.error(err);
});

app.set('trust proxy', process.env.TRUST_PROXY === 'true');

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// bodyParser is definitely not deprecated
// tslint:disable-next-line
app.use(bodyParser.json());
// bodyParser is definitely not deprecated
// tslint:disable-next-line
app.use(bodyParser.urlencoded({extended: false}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

const jwtStrategy = new jwtPassport.Strategy(
  {
    secretOrKey: secretkey,
    jwtFromRequest: jwtPassport.ExtractJwt.fromHeader('x-token'),
  },
  (jwtPayload, done) => {
    logger.debug('Parsing JWT', jwtPayload);

    if (jwtPayload) jwtPayload.displayName = jwtPayload.email.split('@')[0];
    done(null, jwtPayload);
  }
);

let store;

if (process.env.SESSION_STORE === 'redis') {
  store = new (connectRedis(session))({
    client: redis.createClient({host: process.env.SESSION_STORE_HOST, port: parseInt(process.env.SESSION_STORE_PORT || '6379')}),
  });
} else {
  store = new session.MemoryStore();
}

const api = new Api(wss);
const expressSession = session({
  store: store,
  secret: process.env.SESSION_SECRET as string,
  proxy: process.env.SESSION_PROXY === 'true',
  name: process.env.SESSION_NAME,
  cookie: {
    sameSite: process.env.SESSION_SAME_SITE as 'lax' | 'strict' | 'none',
    secure: process.env.SESSION_SECURE === 'true',
  },
  saveUninitialized: process.env.SESSION_SAVE_UNINITIALIZED !== 'false',
  resave: process.env.SESSION_RESAVE === 'true',
});
app.use(expressSession);
app.use(passport.initialize());
app.use(passport.session());

if (process.env.NODE_ENV === 'production') {
  if (process.env.UNIVERSITY === 'gannon') {
    setupAdLogin(app);
    // setupBlackboard(app);
  } else {
    setupShibboleth(app);
  }
  app.get('/auth/check-sso', (req, res) => {
    if (req.isAuthenticated()) res.json({token: 'asdasd'});
    else res.redirect('/auth/sso');
  });
} else {
  app.get('/auth/check-sso', (req, res) => {
    res.send('SSO login is disabled in DEBUG mode');
  });
}

// debug email login
if (process.env.NODE_ENV === 'development') {
  passport.use(jwtStrategy);
  app.post('/auth/email', (req, res) => {
    logger.trace('/auth/email');
    const token = jwt.sign({email: req.body.email}, secretkey);
    // send encoded token
    res.json({
      token,
    });
  });
  app.get('/auth/jwt', passport.authenticate('jwt'), (req, res) => {
    logger.info('JWT Login', req.user);
    logger.trace(req.headers.cookie);
    res.status(204).send();
  });
}

app.get('/auth/moodle', (req, res) => {
  res.set('Content-Type', 'text/html; charset=UTF-8');
  let token;
  const queryString: string = req.query.token as string;
  if (queryString) {
    const split = queryString.split('://token=');
    if (split.length > 1) {
      const b64 = split[1];
      const data = Buffer.from(b64, 'base64').toString();
      const b64Split = data.split(':::');
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

app.get('/auth/check', (req, res) => {
  // @ts-ignore email exists exists in user
  if (req.isAuthenticated())
    res.json({
      // @ts-ignore email exists exists in user
      email: req.user.email,
      // @ts-ignore displayName exists in user
      displayName: req.user.displayName || req.user.email.split('@')[0],
    });
  else res.status(401).send('Unauthorized');
});

app.get('/auth/logout', (req, res) => {
  req.logout();
  res.status(204).send();
});

app.get('/ws', (req, res) => {
  wss.handleUpgrade(req, res.socket, Buffer.from(''), ws => {
    const myWs = ws as MyWebSocket;
    myWs.sessionID = req.sessionID as string;
    myWs.user = req.user as {email: string; displayName: string};
    wss.emit('connection', myWs);
  });
});

app.use('/api', (req, res, next) => {
  if (req.isAuthenticated()) next();
  else res.status(401).send('Unauthorized');
});

app.use('/api', api.getApi());

app.use('/assets', express.static(join(__dirname, './browser/en/assets')));

app.use('/', express.static(join(__dirname, './browser')));

app.use('/:lang(' + availableLanguages.join('|') + ')/*', (req, res) => {
  res.sendFile(join(__dirname, './browser/', req.params.lang, 'index.html'));
});

app.use('*', (req, res) => {
  const negotiator = new Negotiator(req);
  const lang = negotiator.language(availableLanguages) || fallbackLanguage;
  res.sendFile(join(__dirname, './browser/', lang, 'index.html'));
});

wss.on('connection', (ws: MyWebSocket) => {
  ws.isAlive = true;
  ws.on('message', e => {
    try {
      const msg = JSON.parse(e as string);
      if (msg.type === 'pong') ws.isAlive = true;
    } catch (error) {
      // ingore
    }
  });
});

const interval = setInterval(() => {
  if (wss.clients)
    wss.clients.forEach(ws => {
      const myWs = ws as MyWebSocket;
      if (myWs.isAlive === false) return ws.terminate();

      myWs.isAlive = false;
      myWs.send(JSON.stringify({type: 'ping'}));
      // myWs.ping(() => {});
    });
}, 2000);

wss.on('close', () => {
  clearInterval(interval);
});

// Start up the Node server
server.listen(PORT as number, process.env.BINDING_ADDRESS || '0.0.0.0', () => {
  logger.info(`Node Express server listening on http://0.0.0.0:${PORT}`);
});

export interface MyWebSocket extends WebSocket {
  isAlive: boolean;
  sessionID: string;
  user: {email: string; displayName: string};
}

function initLogger(): void {
  // set log level via environment variable (default is info)
  logger.level = process.env.LOGLEVEL || 'info';
  const logconf: Configuration = {
    appenders: {
      stdout: {type: 'stdout'},
    },
    categories: {
      default: {appenders: ['stdout'], level: logger.level},
    },
  };

  if (process.env.LOGFILE && process.env.LOGFILE.endsWith('.log')) {
    // write logs to log file
    logconf.appenders.file = {
      type: 'file',
      filename: process.env.LOGFILE,
      // log size in bytes for log rolling
      maxLogSize: 10485760,
      // number of files for log rolling
      backups: 3,
    };
    logconf.categories.default = {
      appenders: ['file', 'stdout'],
      level: logger.level,
    };
  }

  // configure log4js
  configure(logconf);
}
