import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  Consumer,
  Producer,
  Device,
  Transport
} from "mediasoup-client/lib/types";
import { environment } from "src/environments/environment";
import { ApiService } from "./api.service";
import { Observable, Subscriber } from 'rxjs';

@Injectable({
  providedIn: "root"
})
export class MediaService {
  device: Device;
  localVideoProducer: Producer;
  localAudioProducer: Producer;
  videoConsumers: Stream[] = [];
  audioConsumers: Stream[] = [];
  consumerSubscriber: Subscriber<{videoConsumers: Stream[], audioConsumers: Stream[]}>;
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
    roomId,
    localStream: MediaStream
  ): Promise<Observable<{videoConsumers: Stream[], audioConsumers: Stream[]}>> {
    console.log(localStream);
    await this.setupDevice();

    await this.createSendTransport();
    await this.createRecvTransport();

    await this.addExistingConsumers();

    if (localStream.getVideoTracks().length > 0)
      await this.sendVideo(localStream);
    if (localStream.getAudioTracks().length > 0)
      await this.sendAudio(localStream);
    this.setupWebsocket();

    const observable: Observable<{videoConsumers: Stream[], audioConsumers: Stream[]}> = new Observable((sub) => {
      this.consumerSubscriber = sub;
    });
    return observable;
  }

  toggleMirophone() {
    
  }
  
  toggleCamera() {
    
  }

  updateObserver()  {
    console.log("push data");
    if (this.consumerSubscriber)
      this.consumerSubscriber.next({
        videoConsumers: this.videoConsumers,
        audioConsumers: this.audioConsumers
      })
  }

  private async setupDevice() {
    this.device = new Device();
    const routerRtpCapabilities = await this.api.getCapabilities();
    this.device.load({ routerRtpCapabilities });
  }

  private setupWebsocket() {
    if (environment.production) {
      const url = new URL(window.location.href);
      this.websocket = new WebSocket("wss://" + url.host + "/ws");
    } else {
      this.websocket = new WebSocket("ws://localhost:4000/ws");
    }

    this.websocket.onopen = event => {
      console.log("websocket opened");
      this.websocket.send(JSON.stringify({
        type: "init",
        data: {
          transports: [
            this.sendTransport.id,
            this.recvTransport.id
          ]
        }
      }));
    };
    this.websocket.addEventListener("message", ev => {
      const data = JSON.parse(ev.data);
      switch (data.type) {
        case "new-producer":
          this.addConsumer(data.data.producerId, data.data.kind);
          break;
        case "remove-producer":
          console.log("remove producer");
          this.removeConsumer(data.data.id, data.data.kind);
          break;

        default:
          break;
      }
    });


  }

  private async addExistingConsumers() {
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

  private async addConsumer(producerId, kind) {
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

    this.updateObserver();

    consumer.on("transportclose", () => {
      console.log("track close");
      this.removeConsumer(consumer.id, consumer.kind);
    });
    consumer.on("trackended", () => {
      console.log("track ended");
      this.removeConsumer(consumer.id, consumer.kind);
    });
  }

  private removeConsumer(id: string, kind: string) {
    const list = kind === "video" ? this.videoConsumers : this.audioConsumers;
    const index = list.findIndex(item => item.consumer.producerId === id);
    if (index >= 0) {
      if (kind === "video") {
        this.videoConsumers.splice(index, 1);
      } else {
        this.audioConsumers.splice(index, 1);
      }
      this.updateObserver();
    }

  }

  private async createSendTransport() {
    const params = await this.api.getCreateTransport();
    this.sendTransport = this.device.createSendTransport(params);
    this.addProduceCallbacks(this.sendTransport);
  }

  private async createRecvTransport() {
    const params = await this.api.getCreateTransport();
    this.recvTransport = this.device.createRecvTransport(params);
    this.addProduceCallbacks(this.recvTransport);
  }

  private async sendVideo(localStream: MediaStream) {
    const track = localStream.getVideoTracks()[0];
    this.localVideoProducer = await this.sendTransport.produce({
      track: localStream.getVideoTracks()[0],
      encodings: [
        { maxBitrate: 96000, scaleResolutionDownBy: 4 },
        { maxBitrate: 680000, scaleResolutionDownBy: 1 }
      ]
    });
  }

  private async sendAudio(localStream: MediaStream) {
    const track = localStream.getAudioTracks()[0];
    await track.applyConstraints({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    });
    this.localAudioProducer = await this.sendTransport.produce({
      track,
    });
  }

  private addProduceCallbacks(transport: Transport) {
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
};

export enum CameraState {
  ENABLED =  "videocam",
  DISABLED = "videocam_off"
}

export enum MicState {
  ENABLED =  "mic",
  DISABLED = "mic_off"
}