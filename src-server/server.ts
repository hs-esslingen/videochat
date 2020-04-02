import * as express from "express";
import { Api } from "./api";
import { join } from "path";
import * as WebSocket from "ws";
import * as http from "http";

// Express server
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

const wss = new WebSocket.Server({ server: server, path: "/ws" }, () => {
  console.log("websocket opened");
});

wss.on("error", err => {
  console.error(err);
});


const api = new Api(wss);


app.use("/api", api.getApi());

app.use("/", express.static(join(__dirname, "./browser")));
app.use("*", (req, res) => {
  console.log(req.path);
  res.sendFile(join(__dirname, "./browser/index.html"));
});

wss.on("connection", function connection(ws: MyWebSocket) {
  ws.isAlive = true;
  ws.on("pong", () => ws.isAlive = true);
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws: MyWebSocket) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 10000);

wss.on("close", function close() {
  clearInterval(interval);
});

// Start up the Node server
server.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});

export interface MyWebSocket extends WebSocket {
  isAlive: boolean;
  transports: string[];
}
