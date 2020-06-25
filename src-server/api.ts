import * as express from 'express';
import * as mediasoup from 'mediasoup';
import * as WebSocket from 'ws';
import {MyWebSocket} from './server';
import {Room} from './videochat/room';
import fetch from 'node-fetch';
import * as bodyParser from 'body-parser';
import {Email} from './email';

export class Api {
  readonly api = express.Router();
  worker: mediasoup.types.Worker | undefined;
  router: mediasoup.types.Router | undefined;
  transports: {[id: string]: mediasoup.types.WebRtcTransport} = {};
  consumers: {[id: string]: mediasoup.types.Consumer} = {};
  producers: mediasoup.types.Producer[] = [];

  email: Email | undefined;

  constructor(wss: WebSocket.Server) {
    this.api.use(bodyParser.json());

    this.api.use('/', (req, res, next) => {
      next();
    });

    this.api.get('/room/:roomId/capabilities', async (req, res) => {
      res.json(await Room.getRoom(req.params.roomId).getCapabilities());
    });

    this.api.get('/room/:roomId/create-transport', async (req, res) => {
      try {
        const transport = await Room.getRoom(req.params.roomId).createTransport(req.sessionID as string);
        res.json(transport);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.api.post('/room/:roomId/connect', async (req, res) => {
      await Room.getRoom(req.params.roomId).connect(req.body.id, req.body.dtlsParameters);
      res.status(201).send();
    });

    this.api.post('/room/:roomId/produce', async (req, res) => {
      res.json(await Room.getRoom(req.params.roomId).produce(req.body.id, req.body.kind, req.body.rtpParameters, req.body.appData, req.sessionID as string));
    });

    this.api.post('/room/:roomId/message', async (req, res) => {
      if (req.body.message == null) {
        res.status(400).send('no message provided');
        return;
      }
      try {
        Room.getRoom(req.params.roomId).sendMessage(req.body.message, req.body.to, req.sessionID as string);
        res.status(201).send();
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.api.get('/room/:roomId/messages', async (req, res) => {
      try {
        const messages = Room.getRoom(req.params.roomId).getMessages(req.sessionID as string);
        res.json(messages);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.api.post('/room/:roomId/producer-close', async (req, res) => {
      try {
        await Room.getRoom(req.params.roomId).closeProducer(req.body.id, req.sessionID as string);
        res.status(201).send();
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.api.get('/room/:roomId/producers', async (req, res) => {
      res.json(Room.getRoom(req.params.roomId).getProducers());
    });

    this.api.get('/room/:roomId/users', async (req, res) => {
      res.json(Room.getRoom(req.params.roomId).getUsers());
    });

    this.api.post('/room/:roomId/add-consumer', async (req, res) => {
      try {
        const data = await Room.getRoom(req.params.roomId).addConsumer(req.body.id, req.body.producerId, req.body.rtpCapabilities);
        res.json(data);
      } catch (error) {
        res.status(400).send(error);
      }
    });

    this.api.post('/room/:roomId/resume', async (req, res) => {
      Room.getRoom(req.params.roomId).resumeConsumer(req.body.id);
      res.status(201).send();
    });

    this.api.post('/room/:roomId/user-signal', async (req, res) => {
      try {
        Room.getRoom(req.params.roomId).setUserSignal(req.sessionID as string, req.body.signal);
        res.status(201).send();
      } catch (error) {
        res.status(400).send(error);
      }
    });

    this.api.post('/room/:roomId/microphone-state', async (req, res) => {
      try {
        Room.getRoom(req.params.roomId).setMicrophoneState(req.sessionID as string, req.body.microphoneState);
        res.status(201).send();
      } catch (error) {
        res.status(400).send(error);
      }
    });

    this.api.get('/moodle/courses', async (req, res) => {
      const params = new URLSearchParams();
      params.append('wstoken', req.query.token);
      params.append('moodlewssettingfilter', 'true');
      params.append('moodlewssettingfileurl', 'true');
      params.append('wsfunction', 'core_webservice_get_site_info');

      const info = await fetch('https://moodle.hs-esslingen.de/moodle/webservice/rest/server.php?moodlewsrestformat=json', {
        method: 'POST',
        // @ts-ignore
        body: params,
      });
      const infoData = await info.json();
      if (infoData.errorcode === 'invalidtoken') {
        res.status(401).send(infoData.errorcode);
        return;
      }

      params.append('userid', infoData.userid);
      params.delete('wsfunction');
      params.append('wsfunction', 'core_enrol_get_users_courses');

      const data = await fetch('https://moodle.hs-esslingen.de/moodle/webservice/rest/server.php?moodlewsrestformat=json', {
        method: 'POST',
        // @ts-ignore
        body: params,
      });
      res.json(await data.json());
    });

    wss.on('connection', (ws: MyWebSocket) => {
      function onMessage(e: WebSocket.MessageEvent) {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'init') {
          if (ws.user.email == null) return;
          Room.getRoom(msg.data.roomId).initWebsocket(ws, msg.data, ws.sessionID, ws.user);
          ws.removeEventListener('message', onMessage);
        }
      }
      ws.addEventListener('message', onMessage);
    });
  }

  getApi() {
    return this.api;
  }
}
