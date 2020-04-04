import * as express from "express";
import * as mediasoup from "mediasoup";
import * as bodyParser from "body-parser";
import { IceState } from "mediasoup/lib/types";
import * as WebSocket from 'ws';
import { MyWebSocket as CustomWebSocket, MyWebSocket } from './server';
import * as jwt from 'jsonwebtoken';


export class Api {
  readonly api = express.Router();
  worker: mediasoup.types.Worker;
  router: mediasoup.types.Router;
  transports: { [id: string]: mediasoup.types.WebRtcTransport } = {};
  consumers: { [id: string]: mediasoup.types.Consumer } = {};
  producers: mediasoup.types.Producer[] = [];



  constructor(wss: WebSocket.Server) {

    this.api.use(bodyParser.json());
    this.api.post("/login", (req, res) => {
      const secretkey = "mysecretkey";

      const EmailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      if (req.body.email !== undefined && EmailRegExp.test(req.body.email) && req.body.email.endsWith("hs-esslingen.de")) {
        const token = jwt.sign({ email: req.body.email }, secretkey);
        // send encoded token
        res.send(token);
      }
      else {
        const error = "email is invalid";
        console.log(error);
        res.status(400).send(error);
      }

    });

    this.api.use("/", (req, res, next) => {
      console.log("Token: " + req.headers.token);
      next();
    });

    this.api.get("/capabilities", async (req, res) => {
      await this.createRouter();
      res.json(this.router.rtpCapabilities);
    });

    this.api.get("/get-media", async (req, res) => {
      await this.createRouter();
      const trans = await this.router.createWebRtcTransport({
        listenIps: [{ ip: process.env.IP || "127.0.0.1", announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 800000
      });

      this.transports[trans.id] = trans;

      trans.observer.on("close", () => {
        console.log("transport closed");
        delete this.transports[trans.id]
      });

      trans.on("icestatechange", (iceState: IceState) => {
        if (iceState === "disconnected") {
          trans.close();
        }
        console.log("ICE state changed to %s", iceState);
      });

      res.json({
        id: trans.id,
        iceParameters: trans.iceParameters,
        iceCandidates: trans.iceCandidates,
        dtlsParameters: trans.dtlsParameters,
        sctpParameters: trans.sctpParameters
      });
    });

    this.api.post("/connect", async (req, res) => {
      console.log("CONNECT");
      const trans = this.transports[req.body.id];
      await trans.connect({
        dtlsParameters: req.body.dtlsParameters
      });
      res.status(201).send();
    });

    this.api.post("/produce", async (req, res) => {
      const trans = this.transports[req.body.id];
      const producer = await trans.produce({
        kind: req.body.kind,
        rtpParameters: req.body.rtpParameters
      });

      this.producers.push(producer);

      wss.clients.forEach((ws: CustomWebSocket) => {
        setTimeout(() => {
          console.log("sending new producer");
          ws.send(JSON.stringify({
            type: "new-producer",
            data: {
              producerId: producer.id,
              kind: producer.kind,
            }
          }));
        }, 200);
      });

      producer.on("transportclose", () => {
        console.log("producer transport close");
        this.producers = this.producers.filter(prod => prod.id !== producer.id);
        producer.close();
      });

      producer.observer.on("close", () => {
        console.log("producer close");
        this.producers = this.producers.filter(prod => prod.id !== producer.id);
        wss.clients.forEach(function each(ws: CustomWebSocket) {
          ws.send(JSON.stringify({
            type: "remove-producer",
            data: {
              id: producer.id,
              kind: producer.kind
            }
          }));
        });
      });


      res.json({ id: producer.id });
    });

    this.api.post("/producer-close", async (req, res) => {
      console.log(req.body.id);
      console.log(this.producers);
      if (req.body.id) {
        const producer = this.producers.find((prod) => prod.id === req.body.id);
        if (producer) {
          console.log("closing producer");
          producer.close();
        }
      }
      res.status(201).send();
    });

    this.api.get("/producers", async (req, res) => {
      res.json(
        this.producers.map(prod => {
          return {
            producerId: prod.id,
            kind: prod.kind
          };
        })
      );
    });

    this.api.post("/add-consumer", async (req, res) => {
      const trans = this.transports[req.body.id];
      const consumer = await trans.consume({
        producerId: req.body.producerId,
        rtpCapabilities: req.body.rtpCapabilities,
        paused: true
      });
      this.consumers[consumer.id] = consumer;
      consumer.on("transportclose", () => {
        console.log("transport close");
        consumer.close();
        delete this.consumers[consumer.id];
      });
      consumer.on("producerclose", () => {
        console.log("producer close");
        consumer.close();
        delete this.consumers[consumer.id];
      });
      consumer.observer.on("close", () => {
        delete this.consumers[consumer.id];
      });

      res.json({
        id: consumer.id,
        rtpParameters: consumer.rtpParameters
      });
    });

    this.api.post("/resume", async (req, res) => {
      const consumer = this.consumers[req.body.id];
      await consumer.resume();
      res.status(201).send();
    });

    wss.on("connection", (ws: MyWebSocket) => {
      ws.on("message", (e) => {
        const data = JSON.parse(e.toString());
        switch (data.type) {
          case "init":
            ws.transports = data.data.transports;
            break;
          case "update":
            ws.transports = data.data.transports;
            break;

          default:
            break;
        }
      });
      ws.on("close", (e) => {
        console.log("ws closed");
        if (ws.transports) {
          console.log(ws.transports);
          for (const transportId of ws.transports) {
            if (this.transports[transportId]) this.transports[transportId].close();
          }
        }
      });
    });
  }

  getApi() {
    return this.api;
  }


  private async createWorker() {
    if (this.worker == undefined) this.worker = await mediasoup.createWorker();
  }

  private async createRouter() {
    await this.createWorker();
    if (this.router == undefined)
      this.router = await this.worker.createRouter({
        mediaCodecs: [
          {
            kind: "audio",
            mimeType: "audio/opus",
            clockRate: 48000,
            channels: 2
          },
          {
            kind: "video",
            mimeType: "video/VP8",
            clockRate: 90000
          },
          {
            kind: "video",
            mimeType: "video/h264",
            clockRate: 90000,
            parameters: {
              "packetization-mode": 1,
              "profile-level-id": "4d0032",
              "level-asymmetry-allowed": 1
            }
          },
          {
            kind: "video",
            mimeType: "video/h264",
            clockRate: 90000,
            parameters: {
              "packetization-mode": 1,
              "profile-level-id": "42e01f",
              "level-asymmetry-allowed": 1
            }
          }
        ]
      });
  }
}
