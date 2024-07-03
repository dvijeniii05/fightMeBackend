import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";

const app = express();
const httpServer = createServer(app);
const port = 8080;

app.get("/secondFighter", (req, res) => {
  res.send("Second_FIGHTER");
});

httpServer.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
