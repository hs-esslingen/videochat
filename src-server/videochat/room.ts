import { Worker, Router, MediaKind, RtpParameters, Transport } from "mediasoup/lib/types";
import * as mediasoup from "mediasoup";
import * as WebSocket from "ws";
import { MyWebSocket } from "src-server/server";
import { getLogger } from "log4js";

const logger = getLogger("room");

export class Room {
  static worker: Worker;
  static rooms: { [roomId: string]: Room } = {};

  private router: Router;
  private transports: { [id: string]: mediasoup.types.WebRtcTransport } = {};
  private consumers: { [id: string]: mediasoup.types.Consumer } = {};
  private producers: mediasoup.types.Producer[] = [];
  private websockets: WebSocket[] = [];
  private users: { [sessionId: string]: User } = {};

  private constructor(private roomId: string) {
    // Delete Room if nobody has joined after 10 Seconds
    setTimeout(() => {
      if (Room.rooms[roomId] && Object.keys(Room.rooms[roomId].users).length === 0 && this === Room.rooms[roomId]) {
        logger.warn(
          "Deleting Room " +
            this.roomId +
            " 5s timeout, this only happens if a user joined and left very fast \n" +
            "without establishing a websocket connection"
        );
        this.router?.close();
        delete Room.rooms[this.roomId];
      }
    }, 5000);
  }

  static getRoom(roomId) {
    roomId = unescape(roomId);
    if (this.rooms[roomId] == undefined) {
      logger.info("Creating Room " + roomId);
      this.rooms[roomId] = new Room(roomId);
    }
    return this.rooms[roomId];
  }

  private static async createWorker() {
    // Create single worker, should be engough for now
    // creating more workers would be required if the app runs at a bigger scale
    if (this.worker == undefined) this.worker = await mediasoup.createWorker();
  }

  async getCapabilities() {
    return (await this.getRouter()).rtpCapabilities;
  }

  async createTransport(sessionID: string) {
    if (this.users[sessionID] == undefined) throw new Error("User is not inizialized");

    await this.getRouter();
    const trans = await this.router.createWebRtcTransport({
      listenIps: [{ ip: process.env.IP || "127.0.0.1", announcedIp: null }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 800000,
    });

    this.users[sessionID].transports.push(trans);

    this.transports[trans.id] = trans;

    trans.observer.on("close", () => {
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

  async connect(transportId, dtlsParameters) {
    const trans = this.transports[transportId];
    await trans?.connect({
      dtlsParameters,
    });
  }

  async produce(transportId, kind: MediaKind, rtpParameters: RtpParameters, appData: any, sessionID: string) {
    const trans = this.transports[transportId];
    if (trans) {
      if (this.users[sessionID] == undefined) throw new Error("User is not inizialized");
      const producer = await trans.produce({
        kind,
        rtpParameters,
        appData,
      });

      // Close old Producer if it is still open
      if (this.users[sessionID].producers[appData.type] != undefined) {
        const oldProdId = this.users[sessionID].producers[appData.type];
        if (this.producers[oldProdId] && !this.producers[oldProdId].closed) {
          this.producers[oldProdId].close();
        }
      }

      this.users[sessionID].producers[appData.type] = producer.id;
      this.broadcastMessage(
        {
          type: "update-user",
          data: this.users[sessionID],
        },
        sessionID
      );

      this.producers.push(producer);

      setTimeout(() => {
        this.broadcastMessage({
          type: "add-producer",
          data: {
            producerId: producer.id,
            kind,
          },
        });
      }, 200);

      producer.on("transportclose", () => {
        producer.close();
      });

      producer.observer.on("close", () => {
        this.producers = this.producers.filter((prod) => prod.id !== producer.id);

        this.broadcastMessage({
          type: "remove-producer",
          data: {
            id: producer.id,
            kind: producer.kind,
          },
        });
      });
      return { id: producer.id };
    } else {
      throw new Error("Transport is not existing");
    }
  }

  closeProducer(id, sessionID) {
    return new Promise((res) => {
      if (this.users[sessionID] == undefined) throw new Error("User is not inizialized");
      for (const type in this.users[sessionID].producers) {
        if (this.users[sessionID].producers.hasOwnProperty(type)) {
          const producerId = this.users[sessionID].producers[type];
          if (producerId === id) {
            const producer = this.producers.find((prod) => prod.id === id);
            this.users[sessionID].producers[type] = undefined;
            if (producer) {
              this.broadcastMessage({
                type: "remove-producer",
                data: {
                  id: producer.id,
                  kind: producer.kind,
                },
              });

              this.broadcastMessage({
                type: "update-user",
                data: this.getPublicUser(this.users[sessionID]),
              });
              setTimeout(() => {
                producer.close();
                res();
              }, 300);
            }
          }
        }
      }
    });
  }

  getProducers() {
    return this.producers.map((prod) => {
      return {
        producerId: prod.id,
        kind: prod.kind,
      };
    });
  }

  async addConsumer(transportId, producerId, rtpCapabilities) {
    const trans = this.transports[transportId];
    if (trans) {
      const consumer = await trans.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });
      this.consumers[consumer.id] = consumer;

      consumer.on("transportclose", () => {
        consumer.close();
        delete this.consumers[consumer.id];
      });

      consumer.on("producerclose", () => {
        consumer.close();
        delete this.consumers[consumer.id];
      });

      consumer.observer.on("close", () => {
        delete this.consumers[consumer.id];
      });

      return {
        id: consumer.id,
        rtpParameters: consumer.rtpParameters,
      };
    } else {
      throw new Error("Transport not found");
    }
  }

  async resumeConsumer(id) {
    const consumer = this.consumers[id];
    await consumer?.resume();
  }

  getUsers() {
    return Object.keys(this.users).map((sessionId) => {
      const user = this.users[sessionId];
      return this.getPublicUser(user);
    });
  }

  initWebsocket(ws: WebSocket, initData: WebsocketUserInfo, sessionID: string, { email }) {
    const transports: Transport[] = [];
    let init = false;
    const user: User = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      nickname: initData.nickname,
      transports,
      producers: {},
    };

    ws.on("close", (e) => {
      if (init === false) return;
      logger.info(`${this.roomId}: ${user.nickname || "User"} (${email}) left`);
      delete this.users[sessionID];

      for (const transport of transports) {
        transport.close();
      }

      this.broadcastMessage(
        {
          type: "remove-user",
          data: {
            id: user.id,
            nickname: user.nickname,
            producers: user.producers,
          },
        },
        ws
      );

      this.websockets = this.websockets.filter((item) => item !== ws);

      if (Object.keys(this.users).length === 0) {
        logger.info("Deleting Room " + this.roomId);
        this.router.close();
        // Only delete room from rooms array if the room is the current room
        if (this === Room.rooms[this.roomId]) {
          delete Room.rooms[this.roomId];
        } else {
          logger.warn("Did not delete room globally, because it was overwritten");
        }
      }
    });

    ws.on("message", (e) => {
      const msg = JSON.parse(e.toString());
      switch (msg.type) {
        case "update":
          const data: WebsocketUserInfo = msg.data;
          if (data.nickname) user.nickname = data.nickname;

          this.broadcastMessage(
            {
              type: "update-user",
              data: {
                id: user.id,
                nickname: user.nickname,
                producers: user.producers,
              },
            },
            ws
          );
          break;

        default:
          break;
      }
    });

    // Check if seesion id already exists
    if (this.users[sessionID] == undefined) {
      logger.info(`${this.roomId}: ${user.nickname || "User"} (${email}) joined`);
      this.broadcastMessage(
        {
          type: "add-user",
          data: {
            id: user.id,
            nickname: user.nickname,
            producers: user.producers,
          },
        },
        ws
      );
      this.users[sessionID] = user;
      ws.send(
        JSON.stringify({
          type: "init",
          data: {
            id: user.id,
          },
        })
      );
      init = true;
      this.websockets.push(ws);
    } else {
      ws.send(
        JSON.stringify({
          type: "error-duplicate-session",
        })
      );
      ws.close();
    }
  }

  private getPublicUser(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      producers: user.producers,
    };
  }

  private broadcastMessage(message: { type: string; data: any }, excludeWsOrSession?: any) {
    this.websockets.forEach((ws: MyWebSocket) => {
      if (ws === excludeWsOrSession) return;
      if (ws.sessionID === excludeWsOrSession) return;
      ws.send(JSON.stringify(message));
    });
  }

  private async getRouter(): Promise<Router> {
    await Room.createWorker();
    if (this.router == undefined) {
      this.router = await Room.worker.createRouter({
        mediaCodecs: [
          {
            kind: "audio",
            mimeType: "audio/opus",
            clockRate: 48000,
            channels: 2,
          },
          {
            kind: "video",
            mimeType: "video/h264",
            clockRate: 90000,
            parameters: {
              "packetization-mode": 1,
              "profile-level-id": "42e01f",
              "level-asymmetry-allowed": 1,
              "x-google-start-bitrate": 1000,
            },
          },
          {
            kind: "video",
            mimeType: "video/VP8",
            clockRate: 90000,
            parameters: {
              "x-google-start-bitrate": 1000,
            },
          },
          {
            kind: "video",
            mimeType: "video/h264",
            clockRate: 90000,
            parameters: {
              "packetization-mode": 1,
              "profile-level-id": "4d0032",
              "level-asymmetry-allowed": 1,
              "x-google-start-bitrate": 1000,
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
  nickname: string;
  producers: {
    audio?: string;
    video?: string;
    screen?: string;
  };
  transports?: Transport[];
}

export interface WebsocketUserInfo {
  nickname?: string;
  producers: {
    audio?: string;
    video?: string;
    screen?: string;
  };
  transports?: Transport[];
}
