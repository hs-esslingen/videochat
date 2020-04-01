import * as express from "express";
import * as mediasoup from "mediasoup";
import * as bodyParser from "body-parser";
import { IceState } from "mediasoup/lib/types";

export const api = express.Router();
let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;
const transports: { [id: string]: mediasoup.types.WebRtcTransport } = {};
const consumers: { [id: string]: mediasoup.types.Consumer } = {};
let producers: mediasoup.types.Producer[] = [];

api.use(bodyParser.json());

api.get("/create-worker", async (req, res) => {
  if (worker) worker.close();
  worker = await mediasoup.createWorker();
  res.send("It Works!");
});

async function createWorker() {
  if (worker == undefined) worker = await mediasoup.createWorker();
}

async function createRouter() {
  await createWorker();
  if (router == undefined)
    router = await worker.createRouter({
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

api.get("/capabilities", async (req, res) => {
  await createRouter();
  console.log(router.rtpCapabilities);
  res.json(router.rtpCapabilities);
});

api.get("/get-media", async (req, res) => {
  await createRouter();
  let trans = await router.createWebRtcTransport({
    listenIps: [{ ip: "127.0.0.1", announcedIp: null }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 800000
  });

  transports[trans.id] = trans;

  trans.observer.on("close", () => delete transports[trans.id]);

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

api.post("/connect", async (req, res) => {
  console.log("CONNECT");
  const trans = transports[req.body.id];
  await trans.connect({
    dtlsParameters: req.body.dtlsParameters
  });
  res.status(201).send();
});

api.post("/produce", async (req, res) => {
  console.log("CONNECT");
  const trans = transports[req.body.id];
  const producer = await trans.produce({
    kind: req.body.kind,
    rtpParameters: req.body.rtpParameters
  });

  producers.push(producer);
  producer.on("transportclose", () => {
    producers = producers.filter(prod => prod.id !== producer.id);
  });

  producer.observer.on("close", () => {
    producers = producers.filter(prod => prod.id !== producer.id);
  });

  res.json({ id: producer.id });
});

api.get("/producers", async (req, res) => {
  res.json(
    producers.map(prod => {
      return {
        producerId: prod.id,
        kind: prod.kind
      };
    })
  );
});

api.post("/add-consumer", async (req, res) => {
  const trans = transports[req.body.id];
  const consumer = await trans.consume({
    producerId: req.body.producerId,
    rtpCapabilities: req.body.rtpCapabilities,
    paused: true
  });
  consumers[consumer.id] = consumer;
  consumer.on("transportclose", () => {
    delete consumers[consumer.id];
  });
  consumer.observer.on("close", () => {
    delete consumers[consumer.id];
  });

  res.json({
    id: consumer.id,
    rtpParameters: consumer.rtpParameters
  });
});

api.post("/resume", async (req, res) => {
  const consumer = consumers[req.body.id];
  await consumer.resume();
  res.status(201).send();
});
