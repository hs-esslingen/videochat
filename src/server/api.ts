import * as express from "express";
import * as mediasoup from "mediasoup";

export const api = express.Router();

const worker = mediasoup.createWorker();
api.get("/test", (req,res) => {
  res.send("It Works!");
})