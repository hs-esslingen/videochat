import * as express from "express";
import * as mediasoup from "mediasoup";
import * as WebSocket from "ws";
import { MyWebSocket } from "./server";
import * as jwt from "jsonwebtoken";
import { Room } from "./videochat/room";

export class Api {
  readonly api = express.Router();
  worker: mediasoup.types.Worker;
  router: mediasoup.types.Router;
  transports: { [id: string]: mediasoup.types.WebRtcTransport } = {};
  consumers: { [id: string]: mediasoup.types.Consumer } = {};
  producers: mediasoup.types.Producer[] = [];

  constructor(wss: WebSocket.Server) {
    this.api.post("/login", (req, res) => {
      const secretkey = "mysecretkey";

      const EmailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      if (
        req.body.email !== undefined &&
        EmailRegExp.test(req.body.email) &&
        req.body.email.endsWith("hs-esslingen.de")
      ) {
        const token = jwt.sign({ email: req.body.email }, secretkey);
        // send encoded token
        res.json({
          token,
        });
      } else {
        const error = "email is invalid";
        console.log(error);
        res.status(400).send(error);
      }
    });

    this.api.get("/room/:roomId/capabilities", async (req, res) => {
      res.json(await Room.getRoom(req.params.roomId).getCapabilities());
    });

    this.api.get("/room/:roomId/create-transport", async (req, res) => {
      res.json(await Room.getRoom(req.params.roomId).createTransport());
    });

    this.api.post("/room/:roomId/connect", async (req, res) => {
      await Room.getRoom(req.params.roomId).connect(
        req.body.id,
        req.body.dtlsParameters
      );
      res.status(201).send();
    });

    this.api.post("/room/:roomId/produce", async (req, res) => {
      res.json(
        await Room.getRoom(req.params.roomId).produce(
          req.body.id,
          req.body.kind,
          req.body.rtpParameters
        )
      );
    });

    this.api.post("/room/:roomId/producer-close", async (req, res) => {
      Room.getRoom(req.params.roomId).closeProducer(req.body.id);
      res.status(201).send();
    });

    this.api.get("/room/:roomId/producers", async (req, res) => {
      res.json(Room.getRoom(req.params.roomId).getProducers());
    });

    this.api.get("/room/:roomId/users", async (req, res) => {
      res.json(Room.getRoom(req.params.roomId).getUsers());
    });

    this.api.post("/room/:roomId/add-consumer", async (req, res) => {
      res.json(
        await Room.getRoom(req.params.roomId).addConsumer(
          req.body.id,
          req.body.producerId,
          req.body.rtpCapabilities
        )
      );
    });

    this.api.post("/room/:roomId/resume", async (req, res) => {
      Room.getRoom(req.params.roomId).resumeConsumer(req.body.id);
      res.status(201).send();
    });

    wss.on("connection", (ws: MyWebSocket) => {
      function onMessage(e) {
        const msg = JSON.parse(e.data);
        if (msg.type === "init") {
          console.log("user joined " + msg.data.roomId);
          Room.getRoom(msg.data.roomId).initWebsocket(ws, msg.data);
          ws.removeEventListener("message", onMessage);
        }
      }
      ws.addEventListener("message", onMessage);
    });
  }

  getApi() {
    return this.api;
  }
}
