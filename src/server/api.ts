import * as express from "express";
import * as mediasoup from "mediasoup";

export const api = express.Router();
let worker;
api.get("/test", (req,res) => {
  worker = mediasoup.createWorker();
  res.send("It Works!");
})