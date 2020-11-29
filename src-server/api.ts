import * as express from 'express';
import * as mediasoup from 'mediasoup';
import * as WebSocket from 'ws';
import {MyWebSocket} from './server';
import {getLogger} from 'log4js';
import {Room, UserRole, MoodleUser, Poll, PollResults} from './videochat/room';
import fetch from 'node-fetch';
import * as bodyParser from 'body-parser';
import * as jwt from 'jsonwebtoken';
export const logger = getLogger();

export class Api {
  readonly api = express.Router();
  secretkey = process.env.SIGN_SECRETKEY || 'mysecretkey';
  worker: mediasoup.types.Worker | undefined;
  router: mediasoup.types.Router | undefined;
  transports: {[id: string]: mediasoup.types.WebRtcTransport} = {};
  consumers: {[id: string]: mediasoup.types.Consumer} = {};
  producers: mediasoup.types.Producer[] = [];

  constructor(wss: WebSocket.Server) {
    this.api.use(bodyParser.json());

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
      try {
        await Room.getRoom(req.params.roomId).connect(req.body.id, req.body.dtlsParameters);
        res.status(201).send();
      } catch (e) {
        res.status(500).send(e);
      }
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

    this.api.post('/room/:roomId/poll-publish', async (req, res) => {
      try {
        Room.getRoom(req.params.roomId).publishPoll(req.sessionID as string, req.body.poll as Poll);
        res.status(201).send();
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.api.post('/room/:roomId/poll-response-submit', async (req, res) => {
      try {
        Room.getRoom(req.params.roomId).submitPollResponse(req.sessionID as string, req.body.pollResults as PollResults);
        res.status(201).send();
      } catch (e) {
        console.error(e);
        res.status(500).send(e);
      }
    });

    this.api.post('/room/:roomId/poll-close', async (req, res) => {
      try {
        Room.getRoom(req.params.roomId).closePoll(req.sessionID as string, req.body.pollId);
        res.status(201).send();
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.api.get('/room/:roomId/polls', async (req, res) => {
      try {
        const polls = Room.getRoom(req.params.roomId).getPolls(req.sessionID as string);
        res.json(polls);
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.api.post('/room/:roomId/producer-close', async (req, res) => {
      try {
        await Room.getRoom(req.params.roomId).findAndCloseProducer(req.body.id, req.sessionID as string);
        res.status(201).send();
      } catch (e) {
        res.status(500).send(e);
      }
    });

    this.api.get('/room/:roomId/users', async (req, res) => {
      try {
        res.json(Room.getRoom(req.params.roomId).getUsers(req.sessionID as string));
      } catch (e) {
        res.status(400).send(e);
      }
    });

    this.api.post('/room/:roomId/restart-ice', async (req, res) => {
      try {
        const data = await Room.getRoom(req.params.roomId).restartIce(req.sessionID as string, req.body.id);
        res.json(data);
      } catch (error) {
        res.status(400).send(error);
      }
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

    this.api.get('/room/:roomId/disconnect', (req, res) => {
      try {
        Room.getRoom(req.params.roomId).disconnect(req.sessionID as string);
        res.status(201).send();
      } catch (error) {
        res.status(400).send(error);
      }
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

    this.api.get('/blackboard/courses', async (req, res) => {
      try {
        // @ts-ignore
        const request = await fetch(process.env.OAUTH_URL + '/learn/api/public/v3//courses', {
          // @ts-ignore
          headers: {Authorization: 'Bearer ' + req.user?.accessToken},
        });
        const data = await request.json();
        const courses = data.results
          .filter((item: unknown) => Object.prototype.hasOwnProperty.call(item, 'enrollment'))
          .map((item: {name: string; id: string}) => {
            return {
              fullname: item.name,
              id: item.id,
              shortname: item.name,
            };
          });
        console.log(courses);
        res.json(courses);
      } catch (error) {
        res.status(400).send(error);
      }
    });

    this.api.get('/moodle/courses', async (req, res) => {
      try {
        const params = new URLSearchParams();
        params.append('wstoken', req.query.token as string);
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
      } catch (error) {
        res.status(400).send(error);
      }
    });

    this.api.post('/moodle/check-enrolment', async (req, res) => {
      if (!req.body.courseId) {
        res.status(400).send('courseId is missing');
        return;
      }

      // check if room already exists and get user list from there
      const room = Room.getRoomIfExists('moodle⛳' + req.body.courseId);
      if (room != null) {
        const moodleUsers = room.getMoodleUsers();
        //@ts-ignore
        if (moodleUsers.find(user => user.email === req.user?.email)) {
          const encUsers = jwt.sign(
            {
              courseId: req.body.courseId,
              users: moodleUsers,
              roomName: room.getMoodleRoomName(),
            },
            this.secretkey
          );
          res.json({
            roomName: room.getMoodleRoomName(),
            token: encUsers,
          });
          return;
        }
      }

      // check moodle api
      if (req.body.token == null) {
        res.status(400).send('missingToken');
        return;
      }

      try {
        const params = new URLSearchParams();
        params.append('wstoken', req.body.token as string);
        params.append('courseid', req.body.courseId as string);
        params.append('moodlewssettingfilter', 'true');
        params.append('moodlewssettingfileurl', 'true');
        params.append('wsfunction', 'core_enrol_get_enrolled_users');
        const data = await fetch('https://moodle.hs-esslingen.de/moodle/webservice/rest/server.php?moodlewsrestformat=json', {
          method: 'POST',
          // @ts-ignore
          body: params,
        });
        const userList: {email: string; roles: {roleid: number}[]}[] = await data.json();
        if (Object.prototype.hasOwnProperty.call(userList, 'exception')) {
          logger.debug('Getting moodle course users failed', userList);
          res.status(403).send('User is not in this course');
          return;
        }
        const newUserList: MoodleUser[] = userList.map(user => {
          let role = UserRole.USER;
          if (Array.isArray(user.roles) && user.roles.find(role => role.roleid === 3)) role = UserRole.MODERATOR;
          // moodle⛳1123123 -> unescape() -> moodle/45654654
          return {
            email: user.email,
            role,
          };
        });

        //@ts-ignore
        if (!newUserList.find(user => user.email === req.user?.email)) {
          res.status(403).send('User is not in this course');
          return;
        }

        params.delete('wsfunction');
        params.delete('courseid');
        params.append('wsfunction', 'core_course_get_courses_by_field');
        params.append('field', 'id');
        params.append('value', req.body.courseId);
        const roomInfoRequest = await fetch('https://moodle.hs-esslingen.de/moodle/webservice/rest/server.php?moodlewsrestformat=json', {
          method: 'POST',
          // @ts-ignore
          body: params,
        });

        const roomName = (await roomInfoRequest.json()).courses[0].displayname;

        const encUsers = jwt.sign(
          {
            roomName: roomName,
            courseId: req.body.courseId,
            users: newUserList,
          },
          this.secretkey
        );

        res.json({
          roomName: roomName,
          token: encUsers,
        });
      } catch (error) {
        logger.trace('Moodle User Check error', error);
        res.status(500).send(error);
      }
    });

    wss.on('connection', (ws: MyWebSocket) => {
      function onMessage(e: WebSocket.MessageEvent) {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'init') {
          if (ws.user?.email == null) return;
          Room.getRoom(msg.data.roomId).initWebsocket(ws, msg.data, ws.sessionID, ws.user);
          ws.removeEventListener('message', onMessage);
        } else if (msg.type === 'reconnect') {
          if (ws.user?.email == null) return;
          Room.getRoom(msg.data.roomId).reconnect(ws, ws.sessionID);
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
