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
import { Observable, Subscriber } from "rxjs";

export enum CameraState {
  ENABLED = "videocam",
  DISABLED = "videocam_off",
}

export enum MicrophoneState {
  ENABLED = "mic",
  DISABLED = "mic_off",
}

@Injectable({
  providedIn: "root",
})
export class MediaService {
  private device: Device;
  private localVideoProducer: Producer;
  private localAudioProducer: Producer;
  private videoConsumers: Stream[] = [];
  private audioConsumers: Stream[] = [];
  private addingProducers: string[] = [];
  private consumerSubscriber: Subscriber<{
    videoConsumers: Stream[];
    audioConsumers: Stream[];
    autoGainControl: boolean;
    cameraState: CameraState;
    microphoneState: MicrophoneState;
    localStream: MediaStream;
  }>;
  private recvTransport: Transport;
  private sendTransport: Transport;
  private websocket: WebSocket;
  private status: Status;
  private autoGainControl: boolean;
  private microphoneState: MicrophoneState;
  private cameraState: CameraState;
  private localStream: MediaStream;
  private startingCameraStream = false;

  constructor(private api: ApiService) {
    this.autoGainControl = localStorage.getItem("autoGainControl") !== "false";
  }

  public async getUserMedia(): Promise<MediaStream> {
    const capabilities = await navigator.mediaDevices.enumerateDevices();
    const video =
      capabilities.find((cap) => cap.kind === "videoinput") != undefined;
    return await navigator.mediaDevices.getUserMedia({
      video,
      audio: {
        autoGainControl: this.autoGainControl,
      },
    });
  }

  public async connectToRoom(
    roomId,
    localStream: MediaStream
  ): Promise<MediaObservable> {
    this.localStream = localStream;
    await this.setupDevice();

    await this.createSendTransport();
    await this.createRecvTransport();

    if (localStream.getVideoTracks().length > 0) {
      this.cameraState = CameraState.ENABLED;
      await this.sendVideo(localStream);
    } else {
      this.cameraState = CameraState.DISABLED;
    }

    if (localStream.getAudioTracks().length > 0) {
      this.microphoneState = MicrophoneState.ENABLED;
      await this.sendAudio(localStream);
    } else {
      this.microphoneState = MicrophoneState.DISABLED;
    }

    this.setupWebsocket();

    const observable: MediaObservable = new Observable((sub) => {
      this.consumerSubscriber = sub;
    });
    return observable;
  }

  toggleMirophone() {
    if (this.localAudioProducer.paused) {
      this.localAudioProducer.resume();
      this.microphoneState = MicrophoneState.ENABLED;
    } else {
      this.localAudioProducer.pause();
      this.microphoneState = MicrophoneState.DISABLED;
    }
    this.updateObserver();
  }

  async toggleCamera() {
    if (
      this.localVideoProducer != undefined &&
      !this.localVideoProducer?.closed
    ) {
      this.localVideoProducer.close();
      await this.api.producerClose(this.localVideoProducer.id);
      this.cameraState = CameraState.DISABLED;
      this.localStream = undefined;
    } else {
      if (!this.startingCameraStream)
        try {
          this.startingCameraStream = true;
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          this.localStream = mediaStream;
          this.cameraState = CameraState.ENABLED;
          this.updateObserver();
          await this.sendVideo(mediaStream);

          this.websocket.send(
            JSON.stringify({
              type: "update",
              data: {
                transports: [this.sendTransport?.id, this.recvTransport?.id],
              },
            })
          );

          setTimeout(() => {
            this.startingCameraStream = false;
          }, 500);
        } catch (e) {
          console.error(e);
          setTimeout(() => {
            this.startingCameraStream = false;
          }, 500);
          this.localStream = undefined;
        }
    }
    this.updateObserver();
  }

  toggleAutoGainControl() {
    console.log("toggle: autoGainControl");
    localStorage.setItem("autoGainControl", (!this.autoGainControl).toString());
    this.autoGainControl = !this.autoGainControl;
  }

  updateObserver() {
    console.log("push data");
    if (this.consumerSubscriber)
      this.consumerSubscriber.next({
        videoConsumers: this.videoConsumers,
        audioConsumers: this.audioConsumers,
        autoGainControl: this.autoGainControl,
        microphoneState: this.microphoneState,
        cameraState: this.cameraState,
        localStream: this.localStream,
      });
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

    this.websocket.onopen = async (event) => {
      console.log("websocket opened");
      this.updateObserver();

      await this.addExistingConsumers();

      this.websocket.send(
        JSON.stringify({
          type: "init",
          data: {
            transports: [this.sendTransport?.id, this.recvTransport?.id],
          },
        })
      );
    };

    this.websocket.addEventListener("message", (ev) => {
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
          (item) => item.consumer.id === prod.producerId
        ) == undefined &&
        this.audioConsumers.find(
          (item) => item.consumer.id === prod.producerId
        ) == undefined
      ) {
        console.log("adding existing consumer");
        await this.addConsumer(prod.producerId, prod.kind);
      }
    }
  }

  private async addConsumer(producerId, kind) {
    if (this.addingProducers.includes(producerId)) {
      console.log("duplicate");
      return;
    }
    this.addingProducers.push(producerId);

    if (
      producerId === this.localVideoProducer?.id ||
      producerId === this.localAudioProducer?.id
    ) {
      console.log("is local");
      return;
    }

    console.log("ADDING: " + kind);

    const consume = await this.api.addConsumer(
      this.recvTransport.id,
      this.device.rtpCapabilities,
      producerId
    );

    const consumer = await this.recvTransport.consume({
      id: consume.id,
      kind,
      producerId,
      rtpParameters: consume.rtpParameters,
    });

    await this.api.resume(consume.id);
    console.log("resume");

    if (consumer.kind === "video")
      this.videoConsumers.push({
        consumer,
        stream: new MediaStream([consumer.track]),
      });
    else {
      this.audioConsumers.push({
        consumer,
        stream: new MediaStream([consumer.track]),
      });
    }

    this.updateObserver();

    this.addingProducers.slice(
      this.addingProducers.findIndex((item) => item === producerId)
    );

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
    const index = list.findIndex((item) => item.consumer.producerId === id);
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
    this.localVideoProducer = await this.sendTransport.produce({
      track: localStream.getVideoTracks()[0],
      encodings: [
        { maxBitrate: 96000, scaleResolutionDownBy: 4 },
        { maxBitrate: 680000, scaleResolutionDownBy: 1 },
      ],
    });
  }

  private async sendAudio(localStream: MediaStream) {
    const track = localStream.getAudioTracks()[0];
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
  CONNECTED,
}

export type MediaObservable = Observable<{
  videoConsumers: Stream[];
  audioConsumers: Stream[];
  autoGainControl: boolean;
  cameraState: CameraState;
  microphoneState: MicrophoneState;
  localStream: MediaStream;
}>;
