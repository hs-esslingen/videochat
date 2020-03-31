import * as express from "express";

export const api = express.Router();

api.get("/test", (req,res) => {
  res.send("It Works!");
})