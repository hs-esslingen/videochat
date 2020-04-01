import * as express from "express";
import { api } from './api';
import {join} from "path";

// Express server
const app = express();

const PORT = process.env.PORT || 4000;

console.log(__dirname);

app.use("/api", api);

app.use("/", express.static(join(__dirname,"./browser")))
app.use("*", (req, res) => {
  console.log(join(__dirname, "./browser/index.html"));
  res.sendFile(join(__dirname, "./browser/index.html"))
})

// Start up the Node server
app.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
});
