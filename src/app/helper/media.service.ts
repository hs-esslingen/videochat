import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  Consumer,
  Producer,
  Device,
  Transport,
} from "mediasoup-client/lib/types";
import { environment } from "src/environments/environment";
import { ApiService } from "./api.service";

@Injectable({
  providedIn: "root"
})
export class MediaService {
  device: Device;
  localVideoProducer: Producer;
  localAudioProducer: Producer;
  videoConsumers: {
    consumer: Consumer;
    stream: MediaStream;
  }[] = [];
  audioConsumers: {
    consumer: Consumer;
    stream: MediaStream;
  }[] = [];
  recvTransport: Transport;
  sendTransport: Transport;
  websocket: WebSocket;
  status: Status;

  constructor(private api: ApiService) {}

  public async getUserMedia(): Promise<MediaStream> {
    const capabilities = await navigator.mediaDevices.enumerateDevices();
    const video =
      capabilities.find(cap => cap.kind === "videoinput") != undefined;
    const audio =
      capabilities.find(cap => cap.kind === "audioinput") != undefined;
    return await navigator.mediaDevices.getUserMedia({
      video,
      audio
    });
  }

  public async connectToRoom(
    roomId, localStream: MediaStream
  ): Promise<{ videoConsumers: Stream[]; audioConsumers: Stream[] }> {
    await this.setupDevice();

    await this.createSendTransport();
    await this.createRecvTransport();

    await this.addExistingConsumers();

    if (localStream.getVideoTracks().length > 0)
    await this.sendVideo(localStream);
    if (localStream.getAudioTracks().length > 0)
      await this.sendAudio(localStream);
    this.setupWebsocket();

    return {
      videoConsumers: this.videoConsumers,
      audioConsumers: this.audioConsumers
    };
  }

  async setupDevice() {
    this.device = new Device();
    const routerRtpCapabilities = await this.api.getCapabilities();
    this.device.load({ routerRtpCapabilities });
  }

  setupWebsocket() {
    if (environment.production) {
      const url = new URL(window.location.href);
      this.websocket = new WebSocket("wss://" + url.host + "/ws");
    } else {
      this.websocket = new WebSocket("ws://localhost:4000/ws");
    }

    this.websocket.onopen = event => {
      console.log("websocket opened");
    };
    this.websocket.addEventListener("message", ev => {
      const data = JSON.parse(ev.data);
      switch (data.type) {
        case "new-producer":
          this.addConsumer(data.data.producerId, data.data.kind);
          break;
        case "remove-producer":
          this.removeConsumer(data.data.id, data.data.kind);
          break;

        default:
          break;
      }
    });
  }

  async addExistingConsumers() {
    console.log("GET CONSUMER");
    const producers = await this.api.getProducers();
    for (const prod of producers) {
      if (
        this.videoConsumers.find(
          item => item.consumer.id === prod.producerId
        ) == undefined &&
        this.audioConsumers.find(
          item => item.consumer.id === prod.producerId
        ) == undefined
      ) {
        await this.addConsumer(prod.producerId, prod.kind);
      }
    }
  }

  async addConsumer(producerId, kind) {
    console.log("ADDING");

    if (
      producerId === this.localVideoProducer?.id ||
      producerId === this.localAudioProducer?.id
    )
      return;
    const consume = await this.api.addConsumer(
      this.recvTransport.id,
      this.device.rtpCapabilities,
      producerId
    );

    const consumer = await this.recvTransport.consume({
      id: consume.id,
      kind,
      producerId,
      rtpParameters: consume.rtpParameters
    });

    await this.api.resume(consume.id);

    if (consumer.kind === "video")
      this.videoConsumers.push({
        consumer,
        stream: new MediaStream([consumer.track])
      });
    else {
      this.audioConsumers.push({
        consumer,
        stream: new MediaStream([consumer.track])
      });
    }

    consumer.on("transportclose", () => {
      console.log("track close");
      this.removeConsumer(consumer.id, consumer.kind);
    });
    consumer.on("trackended", () => {
      console.log("track ended");
      this.removeConsumer(consumer.id, consumer.kind);
    });
  }

  removeConsumer(id: string, kind: string) {
    console.log(kind);
    const list = kind === "video" ? this.videoConsumers : this.audioConsumers;
    const index = list.findIndex(item => item.consumer.producerId !== id);
    if (index >= 0)
      if (kind === "video") {
        this.videoConsumers.splice(index, 1);
      } else {
        this.audioConsumers.splice(index, 1);
      }
  }

  async createSendTransport() {
    const params = await this.api.getMedia();
    this.sendTransport = this.device.createSendTransport(params);
    this.addProduceCallbacks(this.sendTransport);
  }

  async createRecvTransport() {
    const params = await this.api.getMedia();
    this.recvTransport = this.device.createRecvTransport(params);
    this.addProduceCallbacks(this.recvTransport);
  }

  async sendVideo(localStream: MediaStream) {
    this.localVideoProducer = await this.sendTransport.produce({
      track: localStream.getVideoTracks()[0],
      encodings: [
        { maxBitrate: 96000, scaleResolutionDownBy: 4 },
        { maxBitrate: 680000, scaleResolutionDownBy: 1 }
      ]
    });
  }

  async sendAudio(localStream: MediaStream) {
    this.localAudioProducer = await this.sendTransport.produce({
      track: localStream.getAudioTracks()[0].clone()
    });
  }

  addProduceCallbacks(transport: Transport) {
    transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      // Signal local DTLS parameters to the server side transport.
      try {
        await this.api.connect(transport.id, dtlsParameters);
        // Tell the transport that parameters were transmitted.
        console.log("CONNECTED");
        callback();
      } catch (error) {
        // Tell the transport that something was wrong.
        console.error(error);
        errback(error);
      }
    });

    transport.on("produce", async (parameters, callback, errback) => {
      console.log("PRODUCE");
      try {
        const { id } = await this.api.produce(
          transport.id,
          parameters.kind,
          parameters.rtpParameters,
          parameters.appData
        );
        callback({ id });
      } catch (err) {
        console.error(err);
        errback();
      }
    });
  }
}

export type Stream = {
  consumer: Consumer;
  stream: MediaStream;
};

export enum Status {
  DISCONNECTED,
  CONNECTED
}
