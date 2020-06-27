import {Worker, Router, MediaKind, RtpParameters, DtlsParameters, RtpCapabilities, AudioLevelObserver, WebRtcTransport} from 'mediasoup/lib/types';
import * as mediasoup from 'mediasoup';
import * as WebSocket from 'ws';
import {MyWebSocket} from 'src-server/server';
import {getLogger} from 'log4js';

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
  private currentScreenshare?: mediasoup.types.Producer;
  private audioLevelObserver: AudioLevelObserver | undefined;
  private checkConnectionInterval: NodeJS.Timeout;

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
            logger.debug(`${user.nickname} - ${type} - ${producer?.score.map(i => i.score).join(',')}`);
            if (producer?.score.reduce((a, b) => a + b.score, 0) === 0 && user.ws.OPEN) {
              user.state = UserConnectionState.DANGLING;
              logger.debug(`${user.nickname} - ${type} - lost connection`);
              user.ws.send(
                JSON.stringify({
                  type: 'reconnect',
                  data: {},
                })
              );
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
      from: user.nickname,
      // send to User.id
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

  async createTransport(sessionID: string) {
    if (this.users[sessionID] == null) throw new Error('User is not inizialized');

    await this.getRouter();
    const trans = await this.router.createWebRtcTransport({
      listenIps: [{ip: process.env.IP || '127.0.0.1', announcedIp: undefined}],
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

  getUsers() {
    return Object.keys(this.users)
      .map(sessionId => this.users[sessionId])
      .filter(user => user.state === UserConnectionState.CONNECTED)
      .map(user => this.getPublicUser(user));
  }

  async setUserSignal(sessionID: string, signal: UserSignal) {
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

  async setMicrophoneState(sessionID: string, microphoneState: MicrophoneState) {
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

  async restartIce(sessionId: string, id: string) {
    const user = this.users[sessionId];
    if (user == null) throw new Error('User is not inizialized');
    user.state = UserConnectionState.CONNECTED;
    const transport = user.transports.find(t => t.id === id);
    if (transport == null) throw new Error('Transport not found');
    return transport.restartIce();
  }

  initWebsocket(ws: WebSocket, initData: WebsocketUserInfo, sessionID: string, {email}: {email: string}) {
    const transports: WebRtcTransport[] = [];
    let user: User;
    if (this.users[sessionID] == null) {
      user = {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        ws: ws,
        nickname: initData.nickname,
        transports,
        producers: {},
        microphoneState: initData.microphoneState,
        signal: UserSignal.NONE,
        state: UserConnectionState.CONNECTED,
      };

      // Check if seesion id already exists
      logger.info(`${this.roomId}: ${user.nickname || 'User'} (${email}) joined`);
      this.broadcastMessage(
        {
          type: 'add-user',
          data: this.getPublicUser(user),
        },
        ws
      );
      this.users[sessionID] = user;
      ws.send(
        JSON.stringify({
          type: 'init',
          data: {
            id: user.id,
          },
        })
      );
      this.websockets.push(ws);
    } else if (this.users[sessionID].state === UserConnectionState.DISCONNECTED) {
      user = this.users[sessionID];
      user.ws = ws;
      logger.info(`${this.roomId}: ${user.nickname || 'User'} (${email}) reconnected`);
    } else {
      ws.send(
        JSON.stringify({
          type: 'error-duplicate-session',
        })
      );
      ws.close();
      return;
    }
    logger.trace(user.id);

    ws.on('close', () => {
      logger.info(`${this.roomId}: ${user.nickname || 'User'} (${email}) left`);
      this.users[sessionID].state = UserConnectionState.DISCONNECTED;
      this.users[sessionID].producers = {};

      for (const transport of transports) {
        transport.close();
      }

      this.broadcastMessage(
        {
          type: 'remove-user',
          data: this.getPublicUser(user),
        },
        ws
      );

      this.websockets = this.websockets.filter(item => item !== ws);

      this.checkRoomDeletion();
    });

    ws.on('message', e => {
      const msg = JSON.parse(e.toString());
      switch (msg.type) {
        case 'update':
          {
            const data: WebsocketUserInfo = msg.data;
            if (data.nickname) user.nickname = data.nickname;

            this.broadcastMessage(
              {
                type: 'update-user',
                data: this.getPublicUser(user),
              },
              ws
            );
          }
          break;

        default:
          break;
      }
    });
  }

  private checkRoomDeletion() {
    if (
      Room.rooms[this.roomId] &&
      Object.keys(this.users)
        .map(sessionId => this.users[sessionId])
        .filter(user => user.state === UserConnectionState.CONNECTED).length === 0
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
  producers: {
    audio?: string;
    video?: string;
    screen?: string;
  };
  transports: WebRtcTransport[];
  signal: UserSignal;
  microphoneState: MicrophoneState;
  role?: UserRole;
  state: UserConnectionState;
}

export interface WebsocketUserInfo {
  nickname: string;
  microphoneState: MicrophoneState;
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

export enum UserSignal {
  NONE = 0,
  RAISED_HAND = 1,
  VOTED_UP = 2,
  VOTED_DOWN = 3,
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
  DISCONNECTED = 2,
}
