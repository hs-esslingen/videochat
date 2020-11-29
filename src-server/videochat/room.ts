import {Worker, Router, MediaKind, RtpParameters, DtlsParameters, RtpCapabilities, AudioLevelObserver, WebRtcTransport} from 'mediasoup/lib/types';
import * as mediasoup from 'mediasoup';
import * as WebSocket from 'ws';
import {MyWebSocket} from 'src-server/server';
import {getLogger} from 'log4js';
import * as jwt from 'jsonwebtoken';

const logger = getLogger('room');

export class Room {
  static worker: Worker;
  static rooms: {[roomId: string]: Room} = {};

  private router!: Router;
  private transports: {[id: string]: mediasoup.types.WebRtcTransport} = {};
  private consumers: {[id: string]: mediasoup.types.Consumer} = {};
  private producers: {[id: string]: mediasoup.types.Producer} = {};
  private websockets: WebSocket[] = [];
  private users: {[sessionId: string]: User} = {};
  private polls: {[pollId: string]: Poll} = {};
  private currentScreenshare?: mediasoup.types.Producer;
  private audioLevelObserver: AudioLevelObserver | undefined;
  private checkConnectionInterval: NodeJS.Timeout;
  private moodleUsers: MoodleUser[] = [];
  private moodleRoomName = '';

  private messages: Message[] = [];

  private constructor(private roomId: string) {
    // Delete Room if nobody has joined after 10 Seconds
    setTimeout(() => {
      this.checkRoomDeletion();
    }, 5000);

    this.checkConnectionInterval = (setInterval(() => {
      for (const sessionId in this.users) {
        const user = this.users[sessionId];
        if (user.state !== UserConnectionState.CONNECTED) continue;
        for (const type in user.producers) {
          const producerId = user.producers[type as 'audio' | 'video' | 'screen'];
          if (producerId) {
            const producer = this.producers[producerId];
            if (producer.paused) continue;
            if (producer.closed) continue;
            if (producer == null) continue;
            if (producer.score.length > 0 && producer.score.reduce((a, b) => a + b.score, 0) === 0 && user.ws.OPEN) {
              user.state = UserConnectionState.DANGLING;
              logger.debug(`${user.nickname} - ${type} - lost connection`);
              user.ws.send(
                JSON.stringify({
                  type: 'restart-ice',
                  data: {},
                })
              );
              if (user.danglingTimeout) clearTimeout(user.danglingTimeout);
              user.danglingTimeout = (setTimeout(() => {
                if (user.state === UserConnectionState.DANGLING) {
                  logger.debug(`${user.nickname} - dangling timeout`);
                  this.disconnect(sessionId);
                }
              }, 10000) as unknown) as NodeJS.Timeout;
            }
          }
        }
      }
    }, 1000) as unknown) as NodeJS.Timeout;

    this.getRouter().then(async () => {
      // this.audioLevelObserver = await this.router.createAudioLevelObserver({
      //   maxEntries: 1,
      //   threshold: -80,
      //   interval: 1000,
      // });
      // this.audioLevelObserver.addListener('volumes', (volumes: {producer: Producer; volume: number}[]) => {
      //   for (const sessionId in this.users) {
      //     const user = this.users[sessionId];
      //     if (user.microphoneState === MicrophoneState.DISABLED) return;
      //     if (volumes.find((item: {producer: Producer; volume: number}) => item.producer.appData.userId === user.id)) {
      //       if (user.microphoneState === MicrophoneState.ENABLED) {
      //         user.microphoneState = MicrophoneState.TALKING;
      //         this.broadcastMessage({
      //           type: 'update-user',
      //           data: this.getPublicUser(user),
      //         });
      //       }
      //     } else if (user.microphoneState === MicrophoneState.TALKING) {
      //       user.microphoneState = MicrophoneState.ENABLED;
      //       this.broadcastMessage({
      //         type: 'update-user',
      //         data: this.getPublicUser(user),
      //       });
      //     }
      //   }
      // });
      // this.audioLevelObserver.addListener('silence', () => {
      //   for (const sessionId in this.users) {
      //     const user = this.users[sessionId];
      //     if (user.microphoneState === MicrophoneState.TALKING) {
      //       user.microphoneState = MicrophoneState.ENABLED;
      //       this.broadcastMessage({
      //         type: 'update-user',
      //         data: this.getPublicUser(user),
      //       });
      //     }
      //   }
      // });
    });
  }

  static getRoom(roomId: string) {
    roomId = unescape(roomId);
    if (this.rooms[roomId] == null) {
      logger.info('Creating Room ' + roomId);
      this.rooms[roomId] = new Room(roomId);
    }
    return this.rooms[roomId];
  }

  static getRoomIfExists(roomId: string): Room | undefined {
    roomId = unescape(roomId);
    return this.rooms[roomId];
  }

  private static async createWorker() {
    // Create single worker, should be engough for now
    // creating more workers would be required if the app runs at a bigger scale
    if (this.worker == null) this.worker = await mediasoup.createWorker();
  }

  async getCapabilities() {
    return (await this.getRouter()).rtpCapabilities;
  }

  getMessages(sessionID: string) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');

    const userId = this.users[sessionID].id;

    logger.trace(this.messages.filter(item => item.to == null || item.from === userId || item.to === userId));
    return this.messages.filter(item => item.to == null || item.from === userId || item.to === userId);
  }

  sendMessage(message: string, to: string | undefined, sessionID: string) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');

    const user = this.users[sessionID];

    logger.trace('sendMessage:');
    logger.trace(message, to);

    const m: Message = {
      from: user.id,
      to,
      time: Date.now(),
      message,
    };
    logger.trace(m);

    // send Websocket Message
    if (to == null) {
      // send a public message
      // if no receiver is specified send message to all participants
      this.broadcastMessage({
        type: 'message',
        data: m,
      });
    } else {
      // send a private message
      // send message to sender
      try {
        user.ws.send(
          JSON.stringify({
            type: 'message',
            data: m,
          })
        );

        // send message to receiver
        for (const key in this.users) {
          const user = this.users[key];
          if (user.id === to) {
            user.ws.send(
              JSON.stringify({
                type: 'message',
                data: m,
              })
            );
            break;
          }
        }
      } catch (error) {
        throw new Error('Sending message failed!');
      }
    }

    this.messages.push(m);
    return;
  }

  publishPoll(sessionID: string, poll: Poll) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');
    const user = this.users[sessionID];
    if (user.role !== UserRole.MODERATOR) throw new Error('User is not moderator');
    if (this.polls[poll.id] != null && this.polls[poll.id].state !== PollState.CREATED) throw new Error('Poll is already published');
    poll.publishedAt = new Date(Date.now()).toISOString();
    poll.owner = user.id;
    this.polls[poll.id] = poll;

    this.broadcastMessage(
      {
        type: 'poll-published',
        data: this.getPublicPoll(poll),
      },
      sessionID
    );
  }

  submitPollResponse(sessionID: string, result: PollResults) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');
    if (this.polls[result.pollId] == null) throw new Error('Poll does not exist');
    const user = this.users[sessionID];
    const poll = this.polls[result.pollId];
    if (poll.responders?.includes(user.id)) throw new Error('User already responded to that poll');
    if (!poll.responders) poll.responders = [];
    poll.responders.push(user.id);
    Object.keys(result.questions).forEach(questionId => {
      const question = poll.questions.find(question => question.id === questionId);
      if (question != null) {
        if (question.results == null) question.results = {};
        // TODO: check type of result
        question.results[user.id] = result.questions[questionId];
      }
    });
    const moderators = Object.values(this.users).filter(user => user.role === UserRole.MODERATOR);
    moderators.forEach(moderator => {
      moderator.ws?.send(
        JSON.stringify({
          type: 'poll-update',
          data: poll,
        })
      );
    });
  }

  closePoll(sessionID: string, pollId: string) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');
    if (this.polls[pollId] == null) throw new Error('Poll does not exist');
    if (this.polls[pollId].state !== PollState.RELEASED) throw new Error('Poll is not released');

    this.polls[pollId].state = PollState.CLOSED;

    this.broadcastMessage(
      {
        type: 'poll-closed',
        data: pollId,
      },
      sessionID
    );
  }

  getPolls(sessionID: string) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');
    const user = this.users[sessionID];

    let polls = Object.values(this.polls);
    if (user.role === UserRole.USER) {
      polls = polls.filter(poll => poll.state === PollState.RELEASED || poll.responders?.includes(user.id));
      return polls.map(poll => this.getPublicPoll(poll, user.id));
    }

    return polls;
  }

  getPublicPoll(poll: Poll, uid?: string) {
    return {
      id: poll.id,
      createdAt: poll.createdAt,
      publishedAt: poll.publishedAt,
      title: poll.title,
      state: poll.state,
      owner: poll.owner,
      questions: poll.questions?.map(pollQuestion => {
        // hide solution and answers of others
        let results = undefined;
        if (uid && pollQuestion.results) {
          results = pollQuestion.results[uid];
        }
        return {
          id: pollQuestion.id,
          type: pollQuestion.type,
          questionText: pollQuestion.questionText,
          answers: pollQuestion.answers,
          results,
        };
      }),
    };
  }

  async createTransport(sessionID: string) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');

    await this.getRouter();
    const trans = await this.router.createWebRtcTransport({
      listenIps: [{ip: process.env.IP || '127.0.0.1', announcedIp: process.env.ANNOUNCED_IP}],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 800000,
    });

    this.users[sessionID].transports.push(trans);

    this.transports[trans.id] = trans;

    trans.observer.on('close', () => {
      delete this.transports[trans.id];
    });

    return {
      id: trans.id,
      iceParameters: trans.iceParameters,
      iceCandidates: trans.iceCandidates,
      dtlsParameters: trans.dtlsParameters,
      sctpParameters: trans.sctpParameters,
    };
  }

  async connect(transportId: string, dtlsParameters: DtlsParameters) {
    const trans = this.transports[transportId];
    await trans?.connect({
      dtlsParameters,
    });
  }

  async produce(
    transportId: string,
    kind: MediaKind,
    rtpParameters: RtpParameters,
    appData: {type: 'audio' | 'video' | 'screen'; userId?: string},
    sessionID: string
  ) {
    const trans = this.transports[transportId];
    if (trans) {
      if (this.users[sessionID] == null) throw new Error('User is not inizialized');
      const user = this.users[sessionID];
      appData.userId = user.id;

      if (appData.type === 'screen' && this.currentScreenshare != null) {
        const user = Object.keys(this.users)
          .map(k => this.users[k])
          .find(u => u.id === this.currentScreenshare?.appData.userId);
        if (user) this.closeProducer(this.currentScreenshare, user);
      }

      const producer = await trans.produce({
        kind,
        rtpParameters,
        appData,
      });

      // Close old Producer if it is still open
      const oldProdId = user.producers[appData.type];
      if (oldProdId != null) {
        const oldProd = this.producers[oldProdId];
        if (oldProd && !oldProd.closed) {
          oldProd.close();
        }
      }

      user.producers[appData.type] = producer.id;
      this.broadcastMessage(
        {
          type: 'update-user',
          data: this.getPublicUser(user),
        },
        sessionID
      );

      if (appData.type === 'screen') this.currentScreenshare = producer;

      this.producers[producer.id] = producer;

      if (kind === 'audio') {
        this.audioLevelObserver?.addProducer({producerId: producer.id});
      }

      setTimeout(() => {
        this.broadcastMessage({
          type: 'add-producer',
          data: {
            producerId: producer.id,
            kind,
          },
        });
      }, 200);

      producer.on('transportclose', () => {
        producer.close();
      });

      producer.on('close', () => {
        if (producer === this.currentScreenshare) this.currentScreenshare = undefined;
      });

      return {id: producer.id};
    } else {
      throw new Error('Transport is not existing');
    }
  }

  closeProducer(producer: mediasoup.types.Producer, user: User) {
    return new Promise(res => {
      user.producers[producer.appData.type as 'audio' | 'video' | 'screen'] = undefined;
      this.broadcastMessage({
        type: 'remove-producer',
        data: {
          id: producer.id,
          kind: producer.kind,
        },
      });

      this.broadcastMessage({
        type: 'update-user',
        data: this.getPublicUser(user),
      });
      setTimeout(() => {
        producer.close();
        res();
      }, 300);
    });
  }

  findAndCloseProducer(id: string, sessionId: string) {
    return new Promise(res => {
      if (this.users[sessionId] == null) throw new Error('User is not inizialized');
      for (const type in this.users[sessionId].producers) {
        if (Object.prototype.hasOwnProperty.call(this.users[sessionId].producers, type)) {
          const producerId = this.users[sessionId].producers[type as 'audio' | 'video' | 'screen'];
          if (producerId === id) {
            const producer = this.producers[producerId];
            if (producer) {
              res(this.closeProducer(producer, this.users[sessionId]));
            }
          }
        }
      }
    });
  }

  async addConsumer(transportId: string, producerId: string, rtpCapabilities: RtpCapabilities) {
    const trans = this.transports[transportId];
    if (trans) {
      const consumer = await trans.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });
      this.consumers[consumer.id] = consumer;

      consumer.on('transportclose', () => {
        consumer.close();
        delete this.consumers[consumer.id];
      });

      consumer.on('producerclose', () => {
        consumer.close();
        delete this.consumers[consumer.id];
      });

      consumer.observer.on('close', () => {
        delete this.consumers[consumer.id];
      });

      return {
        id: consumer.id,
        rtpParameters: consumer.rtpParameters,
      };
    } else {
      throw new Error('Transport not found');
    }
  }

  async resumeConsumer(id: string) {
    const consumer = this.consumers[id];
    await consumer?.resume();
  }

  getUsers(sessionID: string) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');
    return Object.keys(this.users).map(sessionId => this.getPublicUser(this.users[sessionId]));
  }

  setUserSignal(sessionID: string, signal: UserSignal) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');
    if (UserSignal[signal] == null) throw new Error('Signal does not exist');
    const user = this.users[sessionID];
    user.signal = signal;

    this.broadcastMessage(
      {
        type: 'update-user',
        data: this.getPublicUser(user),
      },
      user.ws
    );
  }

  setMicrophoneState(sessionID: string, microphoneState: MicrophoneState) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');
    if (MicrophoneState[microphoneState] == null) throw new Error('Signal does not exist');
    const user = this.users[sessionID];
    user.microphoneState = microphoneState;

    this.broadcastMessage(
      {
        type: 'update-user',
        data: this.getPublicUser(user),
      },
      user.ws
    );
  }

  restartIce(sessionId: string, id: string) {
    const user = this.users[sessionId];
    if (user == null) throw new Error('User is not inizialized');
    if (user.state === UserConnectionState.WS_CLOSED || user.state === UserConnectionState.DISCONNECTED) throw new Error('User is not connected');
    const transport = user.transports.find(t => t.id === id);
    if (transport == null) throw new Error('Transport not found');
    setTimeout(() => {
      if (user.state !== UserConnectionState.DANGLING) return;
      user.state = UserConnectionState.CONNECTED;
    }, 1000);
    return transport.restartIce();
  }

  initWebsocket(ws: WebSocket, initData: WebsocketUserInfo, sessionId: string, {email, displayName}: {email: string; displayName: string}) {
    const transports: WebRtcTransport[] = [];
    let role: UserRole = UserRole.MODERATOR; // SWITCH BACK!
    if (this.roomId.includes('moodle⛳')) {
      try {
        const decodedMoodleToken = jwt.decode(initData.moodleToken as string) as {users: MoodleUser[]; courseId: string; roomName: string};
        this.moodleUsers = decodedMoodleToken.users;
        this.moodleRoomName = decodedMoodleToken.roomName;

        const moodleUser = this.moodleUsers.find(user => user.email === email);
        if (moodleUser == null || parseInt(decodedMoodleToken.courseId) !== parseInt(this.roomId.split('moodle⛳')[1])) {
          logger.info(`${this.roomId}: ${email} - Moodle connection failed - no access`);
          ws.send(
            JSON.stringify({
              type: 'error-failed',
            })
          );
          ws.close();
          return;
        }
        role = moodleUser.role;
      } catch (e) {
        logger.warn(`${this.roomId}: ${email} - Parsing moodleToken failed`, e);
        ws.send(
          JSON.stringify({
            type: 'error-failed',
          })
        );
        ws.close();
        return;
      }
    }

    let user: User;
    if (this.users[sessionId] == null) {
      user = {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        ws: ws,
        nickname: displayName,
        email,
        transports,
        role: role,
        producers: {},
        microphoneState: initData.microphoneState,
        signal: UserSignal.NONE,
        state: UserConnectionState.CONNECTED,
      };

      // Check if seesion id already exists
      logger.info(`${this.roomId}: ${user.nickname || 'User'} (${email}) joined`);
    } else if (this.users[sessionId].state !== UserConnectionState.CONNECTED) {
      user = this.users[sessionId];
      user.state = UserConnectionState.CONNECTED;
      user.producers = {};
      user.transports.forEach(transport => {
        transport?.close();
      });
      user.transports = [];
      user.ws = ws;
      logger.info(`${this.roomId}: ${user.nickname || 'User'} (${email}) joined (reconnect)`);
    } else {
      ws.send(
        JSON.stringify({
          type: 'error-duplicate-session',
        })
      );
      ws.close();
      return;
    }
    this.broadcastMessage(
      {
        type: 'add-user',
        data: this.getPublicUser(user),
      },
      ws
    );
    this.users[sessionId] = user;
    ws.send(
      JSON.stringify({
        type: 'init',
        data: {
          id: user.id,
        },
      })
    );
    this.websockets.push(ws);
    logger.trace(user.id);

    this.wsOnClose(ws, sessionId, this.users[sessionId]);
  }

  disconnect(sessionId: string) {
    const user = this.users[sessionId];
    if (user == null) throw new Error('User is not inizialized');
    logger.info(`${this.roomId}: ${user.nickname || 'User'} (${user.email}) left`);
    user.state = UserConnectionState.DISCONNECTED;
    user.producers = {};
    for (const transport of user.transports) {
      transport.close();
    }
    user.transports = [];

    this.broadcastMessage(
      {
        type: 'disconnect-user',
        data: this.getPublicUser(user),
      },
      user.ws
    );

    this.websockets = this.websockets.filter(item => item !== user.ws);

    this.checkRoomDeletion();
  }

  reconnect(ws: WebSocket, sessionId: string) {
    const user = this.users[sessionId];
    if (user == null || user.state !== UserConnectionState.WS_CLOSED) {
      let message = '';
      if (user == null) message = 'User is not inizialized';
      if (user?.state === UserConnectionState.DISCONNECTED) message = 'User already disconnected';
      else if (user?.state !== UserConnectionState.WS_CLOSED) message = 'User ws in not closed';
      logger.info(`${this.roomId}: ${user?.nickname || 'User'} (${user?.email}) reconnect failed`);
      ws.send(
        JSON.stringify({
          type: 'reconnect-failed',
          data: {
            message,
          },
        })
      );
      return;
    }
    logger.info(`${this.roomId}: ${user.nickname || 'User'} (${user.email}) reconnected`);
    user.ws = ws;
    user.state = UserConnectionState.CONNECTED;
    this.websockets.push(ws);
    ws.send(
      JSON.stringify({
        type: 'reconnect',
        data: this.getPublicUser(user),
      })
    );

    this.wsOnClose(ws, sessionId, this.users[sessionId]);
  }

  getMoodleUsers() {
    return this.moodleUsers;
  }

  getMoodleRoomName() {
    return this.moodleRoomName;
  }

  private wsOnClose(ws: WebSocket, sessionId: string, user: User) {
    ws.on('close', () => {
      this.websockets = this.websockets.filter(item => item !== user.ws);
      if (user.state === UserConnectionState.DISCONNECTED) return;
      logger.info(`${this.roomId}: ${user.nickname || 'User'} (${user.email}) ws closed`);
      user.state = UserConnectionState.WS_CLOSED;
      if (user.closeTimeout) clearTimeout(user.closeTimeout);
      user.closeTimeout = (setTimeout(() => {
        if (user.state === UserConnectionState.WS_CLOSED) {
          try {
            this.disconnect(sessionId);
          } catch (error) {
            // ingore error
            this.checkRoomDeletion();
          }
        }
      }, 10000) as unknown) as NodeJS.Timeout;
    });
  }

  private checkRoomDeletion() {
    if (
      Room.rooms[this.roomId] &&
      Object.keys(this.users)
        .map(sessionId => this.users[sessionId])
        .filter(user => user.state !== UserConnectionState.DISCONNECTED).length === 0
    ) {
      logger.info('Deleting Room ' + this.roomId);
      this.router?.close();
      clearInterval(this.checkConnectionInterval);
      // Only delete room from rooms array if the room is the current room
      if (this === Room.rooms[this.roomId]) {
        delete Room.rooms[this.roomId];
      } else {
        logger.warn('Did not delete room globally, because it was overwritten');
      }
    }
  }

  private getPublicUser(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      producers: user.producers,
      signal: user.signal,
      microphoneState: user.microphoneState,
      state: user.state,
      role: user.role,
    };
  }

  private broadcastMessage(message: {type: string; data: unknown}, excludeWsOrSession?: unknown) {
    this.websockets.forEach(ws => {
      const myWs = ws as MyWebSocket;
      if (ws === excludeWsOrSession) return;
      if (myWs.sessionID === excludeWsOrSession) return;
      ws.send(JSON.stringify(message));
    });
  }

  private async getRouter(): Promise<Router> {
    await Room.createWorker();
    if (this.router == null) {
      this.router = await Room.worker.createRouter({
        mediaCodecs: [
          {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
          },
          {
            kind: 'video',
            mimeType: 'video/h264',
            clockRate: 90000,
            parameters: {
              'packetization-mode': 1,
              'profile-level-id': '42e01f',
              'level-asymmetry-allowed': 1,
              'x-google-start-bitrate': 1000,
            },
          },
          {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
            parameters: {
              'x-google-start-bitrate': 1000,
            },
          },
          {
            kind: 'video',
            mimeType: 'video/h264',
            clockRate: 90000,
            parameters: {
              'packetization-mode': 1,
              'profile-level-id': '4d0032',
              'level-asymmetry-allowed': 1,
              'x-google-start-bitrate': 1000,
            },
          },
        ],
      });
    }
    return this.router;
  }
}

export interface User {
  id: string;
  ws: WebSocket;
  nickname: string;
  email: string;
  producers: {
    audio?: string;
    video?: string;
    screen?: string;
  };
  transports: WebRtcTransport[];
  signal: UserSignal;
  microphoneState: MicrophoneState;
  role: UserRole;
  danglingTimeout?: NodeJS.Timeout;
  closeTimeout?: NodeJS.Timeout;
  state: UserConnectionState;
}

export interface WebsocketUserInfo {
  microphoneState: MicrophoneState;
  moodleToken?: string;
  producers: {
    audio?: string;
    video?: string;
    screen?: string;
  };
  transports?: WebRtcTransport[];
}
export interface Message {
  from: string;
  to?: string;
  time: number;
  message: string;
}

export interface MoodleUser {
  email: string;
  role: UserRole;
}

export interface Poll {
  id: string;
  createdAt: string;
  title?: string;
  state?: PollState;
  owner?: string; // User ID
  responders?: string[];
  questions: PollQuestion[];
  publishedAt?: string;
}

export interface PollQuestion {
  id: string;
  type: QuestionType;
  questionText: string;
  answers: PollAnswer[];
  results: {[uid: string]: string | string[]};
  solution: string | undefined;
}

export interface PollResults {
  pollId: string;
  questions: {[questionId: string]: string | string[]};
}

export interface PollAnswer {
  text?: string;
  id: string;
}

export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  FREE_TEXT = 'FREE_TEXT',
}

export enum PollState {
  CREATED = 0,
  RELEASED = 1,
  CLOSED = 2,
}

export enum UserSignal {
  NONE = 0,
  VOTED_DOWN = 1,
  VOTED_UP = 2,
  RAISED_HAND = 3,
}

export enum MicrophoneState {
  DISABLED = 0,
  ENABLED = 1,
  TALKING = 2,
}

export enum UserRole {
  USER = 0,
  MODERATOR = 1,
}
enum UserConnectionState {
  CONNECTED = 0,
  DANGLING = 1, // WS is still connected, but webrtc connection is lost
  WS_CLOSED = 2, // WS is still connected, but webrtc connection is lost
  DISCONNECTED = 3,
}
