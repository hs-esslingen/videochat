import {
  Worker,
  Router,
  IceState,
  MediaKind,
  RtpParameters,
} from "mediasoup/lib/types";
import * as mediasoup from "mediasoup";
import * as WebSocket from "ws";
import { MyWebSocket } from "src-server/server";

export class Room {
  static worker: Worker;
  static rooms: { [roomId: string]: Room } = {};

  private router: Router;
  private transports: { [id: string]: mediasoup.types.WebRtcTransport } = {};
  private consumers: { [id: string]: mediasoup.types.Consumer } = {};
  private producers: mediasoup.types.Producer[] = [];
  private websockets: WebSocket[] = [];
  private users: User[] = [];

  private constructor(private roomId: string) {}

  static getRoom(roomId) {
    if (this.rooms[roomId] == undefined) {
      console.log("Creating Room " + roomId);
      this.rooms[roomId] = new Room(roomId);
    }
    return this.rooms[roomId];
  }

  private static async createWorker() {
    // Create single worker, should be engough for now
    // creating more workers would be rquired if the app runs at a bigger scale
    if (this.worker == undefined) this.worker = await mediasoup.createWorker();
  }

  async getCapabilities() {
    return (await this.getRouter()).rtpCapabilities;
  }

  async createTransport() {
    await this.getRouter();
    const trans = await this.router.createWebRtcTransport({
      listenIps: [{ ip: process.env.IP || "127.0.0.1", announcedIp: null }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 800000,
    });

    this.transports[trans.id] = trans;

    trans.observer.on("close", () => {
      delete this.transports[trans.id];

      if (Object.keys(this.transports).length === 0) {
        console.log("Deleting Room " + this.roomId);
        this.router.close();
        delete Room.rooms[this.roomId];
      }
    });

    trans.on("icestatechange", (iceState: IceState) => {
      if (iceState === "disconnected") {
        trans.close();
      }
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

  async produce(transportId, kind: MediaKind, rtpParameters: RtpParameters) {
    const trans = this.transports[transportId];
    if (trans) {
      const producer = await trans.produce({
        kind,
        rtpParameters,
      });

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
        this.producers = this.producers.filter(
          (prod) => prod.id !== producer.id
        );

        this.broadcastMessage({
          type: "remove-producer",
          data: {
            id: producer.id,
            kind: producer.kind,
          },
        });
      });
      return { id: producer.id };
    }
  }

  closeProducer(id) {
    const producer = this.producers.find((prod) => prod.id === id);
    if (producer) {
      producer.close();
    }
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
  }

  async resumeConsumer(id) {
    const consumer = this.consumers[id];
    await consumer?.resume();
  }

  getUsers() {
    return this.users.map(({ id, nickname, producers }) => {
      return { id, nickname, producers };
    });
  }


  initWebsocket(
    ws: WebSocket,
    initData: WebsocketUserInfo
  ) {
    let transports: string[] = initData.transports;
    const user: User = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      nickname: initData.nickname,
      producers: initData.producers,
    };

    ws.on("close", (e) => {
      console.log("user left " + this.roomId);
      if (transports) {
        for (const transportId of transports) {
          if (this.transports[transportId])
            this.transports[transportId].close();
        }
      }

      this.broadcastMessage({
        type: "remove-user",
        data: user,
      }, ws);

      this.websockets = this.websockets.filter(item => item !== ws);
      this.users = this.users.filter(item => item !== user);
    });

    ws.on("message", (e) => {
      const msg = JSON.parse(e.toString());
      switch (msg.type) {
        case "update":
          const data: WebsocketUserInfo = msg.data;
          if(data.nickname) user.nickname = data.nickname;
          if(data.producers) user.producers = data.producers;

          this.broadcastMessage({
            type: "update-user",
            data: user,
          }, ws);
          break;

        default:
          break;
      }
    });

    this.broadcastMessage({
      type: "add-user",
      data: user,
    }, ws);

    this.users.push(user);
    this.websockets.push(ws);
  }

  private broadcastMessage(message: { type: string; data: any }, excludeWs?: WebSocket) {
    this.websockets.forEach((ws: MyWebSocket) => {
      if (ws === excludeWs) return;
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
    audio?: string,
    video?: string,
    screen?: string,
  };
}

export interface WebsocketUserInfo {
  nickname?: string;
  producers: {
    audio?: string,
    video?: string,
    screen?: string,
  };
  transports?: string[];
}
