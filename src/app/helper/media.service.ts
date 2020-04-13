import { Injectable } from "@angular/core";
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

export enum ScreenshareState {
  ENABLED = "stop_screen_share",
  DISABLED = "screen_share",
}

export enum Status {
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
}

@Injectable({
  providedIn: "root",
})
export class MediaService {
  private device: Device;
  private localVideoProducer: Producer;
  private localScreenProducer: Producer;
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
    screenshareState: ScreenshareState;
    localStream: MediaStream;
    localScreenshareStream: MediaStream;
    users: User[];
  }>;
  private recvTransport: Transport;
  private sendTransport: Transport;
  private websocket: WebSocket;
  private status: Status = Status.DISCONNECTED;
  private autoGainControl: boolean;
  private microphoneState: MicrophoneState;
  private cameraState: CameraState;
  private screenshareState: ScreenshareState = ScreenshareState.DISABLED;
  private localStream: MediaStream;
  private localScreenshareStream: MediaStream;
  private startingCameraStream = false;
  private roomId: string;
  private users: User[] = [];
  public nickname: string;

  constructor(private api: ApiService) {
    this.autoGainControl = localStorage.getItem("autoGainControl") !== "false";
    this.nickname = localStorage.getItem("nickname");
  }

  public async getUserMedia(): Promise<MediaStream> {
    const capabilities = await navigator.mediaDevices.enumerateDevices();
    const video =
      capabilities.find((cap) => cap.kind === "videoinput") != undefined;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: {
          autoGainControl: this.autoGainControl,
        },
      });
    } catch (e) {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: this.autoGainControl,
        },
      });
    }
    return stream;
  }

  public async connectToRoom(
    roomId,
    localStream: MediaStream
  ): Promise<MediaObservable> {
    this.status = Status.CONNECTING;
    this.roomId = roomId;
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


  setNickname(nickname: string) {
    this.nickname = nickname;
    window.localStorage.setItem("nickname", nickname);
    if (this.websocket)
      this.websocket.send(
        JSON.stringify({
          type: "update",
          data: {
            nickname,
          },
        })
      );
  }

  toggleMirophone() {
    if (this.status !== Status.CONNECTED) return;
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
    if (this.status !== Status.CONNECTED) return;
    if (
      this.localVideoProducer != undefined &&
      !this.localVideoProducer?.closed
    ) {
      this.localVideoProducer.close();
      await this.api.producerClose(this.roomId, this.localVideoProducer.id);
      this.cameraState = CameraState.DISABLED;
      this.localStream = undefined;
    } else {
      if (!this.startingCameraStream)
        try {
          this.startingCameraStream = true;
          this.cameraState = CameraState.ENABLED;
          this.updateObserver();
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          this.localStream = mediaStream;
          this.updateObserver();
          await this.sendVideo(mediaStream);
          this.updateWsProducers();

          setTimeout(() => {
            this.startingCameraStream = false;
          }, 500);
        } catch (e) {
          console.error(e);
          this.cameraState = CameraState.DISABLED;
          this.updateObserver();
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

  async toggleScreenshare() {
    if (this.status !== Status.CONNECTED) return;
    console.log("toggle: screenshare");
    if (!this.localScreenProducer || this.localAudioProducer.closed) {
      try {
        // @ts-ignore
        const localScreen = (await navigator.mediaDevices.getDisplayMedia(
          {}
        )) as MediaStream;
        this.localScreenshareStream = localScreen;

        await this.sendScreen(localScreen);
        this.updateWsProducers();
        this.screenshareState = ScreenshareState.ENABLED;

        this.localScreenProducer.track.onended = async () => {
          setTimeout(() => {
            if (this.screenshareState !== ScreenshareState.DISABLED)
              this.toggleScreenshare();
          }, 0);
        };
        this.updateObserver();
      } catch (e) {
        console.error(e);
      }
    } else {
      this.screenshareState = ScreenshareState.DISABLED;
      this.localScreenshareStream = undefined;
      this.localScreenProducer.close();
      this.api.producerClose(this.roomId, this.localScreenProducer.id);
      this.localScreenProducer = undefined;
      this.updateWsProducers();
      this.updateObserver();
    }
  }

  updateObserver() {
    if (this.consumerSubscriber)
      this.consumerSubscriber.next({
        videoConsumers: this.videoConsumers,
        audioConsumers: this.audioConsumers,
        autoGainControl: this.autoGainControl,
        microphoneState: this.microphoneState,
        screenshareState: this.screenshareState,
        cameraState: this.cameraState,
        localStream: this.localStream,
        localScreenshareStream: this.localScreenshareStream,
        users: this.users,
      });
  }

  private async setupDevice() {
    this.device = new Device();
    const routerRtpCapabilities = await this.api.getCapabilities(this.roomId);
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
      this.status = Status.CONNECTED;

      await this.addExistingConsumers();
      await this.addExistingUsers();

      this.websocket.send(
        JSON.stringify({
          type: "init",
          data: {
            roomId: this.roomId,
            nickname: this.nickname,
            transports: [this.sendTransport?.id, this.recvTransport?.id],
            producers: {
              audio: this.localAudioProducer?.id,
              video: this.localVideoProducer?.id,
              screen: this.localScreenProducer?.id,
            },
          },
        })
      );
    };

    this.websocket.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      switch (msg.type) {
        case "add-producer":
          this.addConsumer(msg.data.producerId, msg.data.kind);
          break;
        case "remove-producer":
          this.removeConsumer(msg.data.id, msg.data.kind);
          break;
        case "add-user":
          {
            const user: User = msg.data;
            if (!this.users.find((item) => item.id === user.id)) {
              this.users.push(user);
              this.updateObserver();
            }
          }
          break;
        case "update-user":
          {
            const user: User = msg.data;
            const foundUser = this.users.find((item) => item.id === user.id);
            foundUser.nickname = user.nickname;
            foundUser.producers = user.producers;
          }
          break;
        case "remove-user":
          {
            const user: User = msg.data;
            this.users = this.users.filter((item) => item.id !== user.id);
            this.updateObserver();
          }
          break;

        default:
          break;
      }
    });
  }

  private updateWsProducers() {
    this.websocket.send(
      JSON.stringify({
        type: "update",
        data: {
          producers: {
            audio: this.localAudioProducer?.id,
            video: this.localVideoProducer?.id,
            screen: this.localScreenProducer?.id,
          },
        },
      })
    );
  }

  private async addExistingConsumers() {
    console.log("GET CONSUMER");
    const producers = await this.api.getProducers(this.roomId);
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
        this.addConsumer(prod.producerId, prod.kind);
      }
    }
  }

  private async addExistingUsers() {
    const users = await this.api.getUsers(this.roomId);
    const newUsers: User[] = [];
    for (const user of users) {
      const foundUser = this.users.find((item) => item.id === user.id);
      if (foundUser) {
        foundUser.nickname = user.nickname;
        foundUser.producers = user.producers;
      } else {
        newUsers.push(user);
      }
    }
    this.users.push(...newUsers);
  }

  private async addConsumer(producerId, kind) {
    if (this.addingProducers.includes(producerId)) {
      console.log("duplicate");
      return;
    }
    this.addingProducers.push(producerId);

    if (
      producerId === this.localVideoProducer?.id ||
      producerId === this.localAudioProducer?.id ||
      producerId === this.localScreenProducer?.id
    ) {
      return;
    }

    console.log("ADDING: " + kind);

    const consume = await this.api.addConsumer(
      this.roomId,
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

    await this.api.resume(this.roomId, consume.id);
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
    const params = await this.api.getCreateTransport(this.roomId);
    this.sendTransport = this.device.createSendTransport(params);
    this.addProduceCallbacks(this.sendTransport);
  }

  private async createRecvTransport() {
    const params = await this.api.getCreateTransport(this.roomId);
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

  private async sendScreen(localStream: MediaStream) {
    this.localScreenProducer = await this.sendTransport.produce({
      track: localStream.getVideoTracks()[0],
      encodings: null,
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
        await this.api.connect(this.roomId, transport.id, dtlsParameters);
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
          this.roomId,
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

  public async disconnect() {
    this.status = Status.DISCONNECTED;
    this.recvTransport?.close();
    this.sendTransport?.close();
    this.localAudioProducer?.close();
    this.localVideoProducer?.close();
    this.users = [];
    this.videoConsumers = [];
    this.audioConsumers = [];
    this.addingProducers = [];
    this.localVideoProducer = undefined;
    this.localScreenshareStream = undefined;
    this.screenshareState = ScreenshareState.DISABLED;
    this.websocket?.close();
  }
}

export type Stream = {
  consumer: Consumer;
  stream: MediaStream;
};

export type MediaObservable = Observable<{
  videoConsumers: Stream[];
  audioConsumers: Stream[];
  autoGainControl: boolean;
  cameraState: CameraState;
  microphoneState: MicrophoneState;
  screenshareState: ScreenshareState;
  localStream: MediaStream;
  localScreenshareStream: MediaStream;
  users: User[];
}>;

export interface WebsocketUserInfo {
  nickname?: string;
  producers: {
    audio?: string;
    video?: string;
    screen?: string;
  };
}

export interface User {
  id: string;
  nickname: string;
  producers: {
    audio?: string;
    video?: string;
    screen?: string;
  };
}
