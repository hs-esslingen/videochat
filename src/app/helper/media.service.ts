import { Injectable } from "@angular/core";
import { Consumer, Producer, Device, Transport } from "mediasoup-client/lib/types";
import { environment } from "src/environments/environment";
import { ApiService } from "./api.service";
import { Observable, Subscriber } from "rxjs";
import { WsService } from "./ws.service";
import { LocalMediaService } from "./local-media.service";

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
export enum Signal {
  NONE = 0,
  RAISED_HAND = 1,
  VOTED_UP = 2,
  VOTED_DOWN = 3,
}

@Injectable({
  providedIn: "root",
})
export class MediaService {
  private device: Device;
  private localVideoProducer: Producer;
  get LocalVideoProducer(): Producer {
    return this.localVideoProducer;
  }
  private localScreenProducer: Producer;
  get LocalScreenProducer(): Producer {
    return this.localScreenProducer;
  }
  private localAudioProducer: Producer;
  get LocalAudioProducer(): Producer {
    return this.localAudioProducer;
  }
  private consumerSubscriber: Subscriber<{
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
  private status: Status = Status.DISCONNECTED;
  private autoGainControl: boolean;
  private microphoneState: MicrophoneState;
  private cameraState: CameraState;
  private screenshareState: ScreenshareState = ScreenshareState.DISABLED;
  private localStream: MediaStream;
  private localScreenshareStream: MediaStream;
  private startingCameraStream = false;
  private roomId: string;
  private userId: string;
  private users: User[] = [];

  public nickname: string;

  constructor(private api: ApiService, private ws: WsService, private localMedia: LocalMediaService) {
    this.autoGainControl = localStorage.getItem("autoGainControl") !== "false";
    this.nickname = localStorage.getItem("nickname");
  }

  public async connectToRoom(roomId, isWebcamDisabled: boolean): Promise<MediaObservable> {
    this.status = Status.CONNECTING;
    this.roomId = roomId;
    await this.setupDevice();

    await this.setupWebsocket();

    await this.createSendTransport();
    await this.createRecvTransport();

    if (!isWebcamDisabled) {
      const videoTracks = await this.localMedia.getVideoTrack();
      this.localStream = new MediaStream(videoTracks.getVideoTracks());
      if (videoTracks.getVideoTracks().length > 0) {
        this.cameraState = CameraState.ENABLED;
        await this.sendVideo(videoTracks);
      } else {
        this.cameraState = CameraState.DISABLED;
      }
    } else {
      this.cameraState = CameraState.DISABLED;
    }

    try {
      const audioTracks = await this.localMedia.getAudioTrack();
      if (audioTracks.getAudioTracks().length > 0) {
        this.microphoneState = MicrophoneState.ENABLED;
        await this.sendAudio(audioTracks);
      } else {
        this.microphoneState = MicrophoneState.DISABLED;
      }
    } catch (error) {
      console.log("AUDIO ERROR");
      this.microphoneState = MicrophoneState.DISABLED;
    }

    this.addExistingUsers();

    // Push an inital update
    setTimeout(() => {
      this.updateObserver();
    }, 500);

    const observable: MediaObservable = new Observable((sub) => {
      this.consumerSubscriber = sub;
    });
    return observable;
  }

  setNickname(nickname: string) {
    this.nickname = nickname;
    window.localStorage.setItem("nickname", nickname);
    this.ws.send("update", { nickname });
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
    if (this.localVideoProducer != undefined && !this.localVideoProducer?.closed) {
      this.localMedia.closeVideo();
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
          const mediaStream = await this.localMedia.getVideoTrack();
          this.localStream = mediaStream;
          this.updateObserver();
          await this.sendVideo(mediaStream);

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
        const localScreen = (await navigator.mediaDevices.getDisplayMedia({})) as MediaStream;
        this.localScreenshareStream = localScreen;

        await this.sendScreen(localScreen);
        this.screenshareState = ScreenshareState.ENABLED;

        this.localScreenProducer.track.onended = async () => {
          setTimeout(() => {
            if (this.screenshareState !== ScreenshareState.DISABLED) this.toggleScreenshare();
          }, 0);
        };
        this.updateObserver();
      } catch (e) {
        console.error(e);
      }
    } else {
      const screenshareTracks = this.localScreenshareStream.getVideoTracks();
      if (screenshareTracks.length > 0) {
        await this.api.producerClose(this.roomId, this.localScreenProducer.id);
      }
      setTimeout(async () => {
        screenshareTracks[0].stop();
        this.screenshareState = ScreenshareState.DISABLED;
        this.localScreenshareStream = undefined;
        this.localScreenProducer.close();
        this.localScreenProducer = undefined;
        this.updateObserver();
      }, 100);
    }
  }

  updateObserver() {
    if (this.consumerSubscriber)
      this.consumerSubscriber.next({
        autoGainControl: this.autoGainControl,
        microphoneState: this.microphoneState,
        screenshareState: this.screenshareState,
        cameraState: this.cameraState,
        localStream: this.localStream,
        localScreenshareStream: this.localScreenshareStream,
        users: this.users,
      });
  }

  private setStatusConnecting() {
    this.status = Status.CONNECTING;
  }

  private async setupDevice() {
    this.device = new Device();
    const routerRtpCapabilities = await this.api.getCapabilities(this.roomId);
    this.device.load({ routerRtpCapabilities });
  }

  private setupWebsocket() {
    return new Promise((res, rej) => {
      if (environment.production) {
        const url = new URL(window.location.href);
        this.ws.connect("wss://" + url.host + "/ws");
      } else {
        this.ws.connect("ws://localhost:4000/ws");
      }

      this.ws.websocket.addEventListener("open", async (event) => {
        console.log("websocket opened");
        this.updateObserver();
        if (this.status === Status.CONNECTING) this.status = Status.CONNECTED;

        this.ws.send("init", {
          roomId: this.roomId,
          nickname: this.nickname,
        });

        // @ts-ignore
        if (this.status === Status.DISCONNECTED) {
          this.ws.close();
          this.disconnect();
          rej();
          return;
        }
      });

      this.ws.messageObserver.subscribe((msg) => {
        switch (msg.type) {
          case "init":
            this.userId = msg.data.id;
            res();
            break;
          case "add-user":
            {
              if (this.recvTransport == undefined || this.recvTransport.id == undefined) return;

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
              if (foundUser) {
                foundUser.nickname = user.nickname;
                foundUser.producers = user.producers;

                if (foundUser.consumers == undefined) foundUser.consumers = {};

                ["audio", "video", "screen"].forEach((type) => {
                  // add missing producers
                  if (foundUser.consumers[type] == undefined && foundUser.producers[type] != undefined)
                    this.addConsumer(foundUser, type as "audio" | "video" | "screen");

                  // remove old producers
                  if (foundUser.consumers[type] != undefined && foundUser.producers[type] == undefined)
                    this.removeConsumer(foundUser, type as "audio" | "video" | "screen")
                });
              }
            }
            break;
          case "remove-user":
            {
              const user: User = msg.data;
              this.users = this.users.filter((item) => item.id !== user.id);
              this.updateObserver();
            }
            break;
          case "error-duplicate-session":
            this.status = Status.DISCONNECTED;
            this.disconnect();
            rej("DUPLICATE SESSION");
            break;

          default:
            break;
        }
      });
    });
  }

  private async addExistingUsers() {
    const users = await this.api.getUsers(this.roomId);
    const newUsers: User[] = [];
    for (const user of users) {
      // Dont add yourself
      if (user.id === this.userId) continue;

      const foundUser = this.users.find((item) => item.id === user.id);
      if (foundUser) {
        console.log("User already exits ... updating");
        foundUser.nickname = user.nickname;
        return;
      }

      for (const key in user.producers) {
        if (user.producers.hasOwnProperty(key)) {
          this.addConsumer(user, key as "audio" | "video" | "screen");
        }
      }
      newUsers.push(user);
    }
    this.users.push(...newUsers);
  }

  private async addConsumer(user: User, type: "audio" | "video" | "screen") {
    const producerId = user.producers[type];
    if (producerId === this.localVideoProducer?.id || producerId === this.localAudioProducer?.id || producerId === this.localScreenProducer?.id) return;
    console.log("ADDING: " + type);

    const consume = await this.api.addConsumer(this.roomId, this.recvTransport.id, this.device.rtpCapabilities, producerId);

    const consumer = await this.recvTransport.consume({
      id: consume.id,
      kind: type === "audio" ? "audio" : "video",
      producerId,
      rtpParameters: consume.rtpParameters,
    });

    if (!user.consumers) user.consumers = {};
    user.consumers[type] = consumer;

    await this.api.resume(this.roomId, consume.id);
    console.log("resume");

    this.updateObserver();

    consumer.on("transportclose", () => {
      console.log("track close");
      this.removeConsumer(user, type);
    });
    consumer.on("trackended", () => {
      console.log("track ended");
      this.removeConsumer(user, type);
    });
  }

  private removeConsumer(user: User, type: "audio" | "video" | "screen") {
    if (!user.consumers || !user.consumers[type]) return;

    user.consumers[type].close();
    user.consumers[type] = undefined;
    this.updateObserver();
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
        { maxBitrate: 680000, scaleResolutionDownBy: 1 },
        // The switching seams to fail in firefox and is not supported in hardware encoders
        // { maxBitrate: 96000, scaleResolutionDownBy: 4 },
      ],
      appData: { type: "video" },
    });
  }

  private async sendScreen(localStream: MediaStream) {
    const codec = this.device.rtpCapabilities.codecs.find((item) => item.mimeType.includes("VP8"));
    this.localScreenProducer = await this.sendTransport.produce({
      track: localStream.getVideoTracks()[0],
      codec,
      appData: { type: "screen" },
    });
  }

  private async sendAudio(localStream: MediaStream) {
    const track = localStream.getAudioTracks()[0];
    this.localAudioProducer = await this.sendTransport.produce({
      track,
      appData: { type: "audio" },
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
        const { id } = await this.api.produce(this.roomId, transport.id, parameters.kind, parameters.rtpParameters, parameters.appData);
        callback({ id });
      } catch (err) {
        console.error(err);
        errback();
      }
    });
  }

  public async disconnect() {
    if (this.status !== Status.CONNECTING) {
      this.recvTransport?.close();
      this.sendTransport?.close();
      this.localAudioProducer?.close();
      this.localVideoProducer?.close();
      this.users = [];
      this.localVideoProducer = undefined;
      this.localScreenshareStream = undefined;
      this.screenshareState = ScreenshareState.DISABLED;
      this.ws.close();
      this.localMedia.closeAudio();
      this.localMedia.closeVideo();
    }
    this.status = Status.DISCONNECTED;
  }
}

export type Stream = {
  consumer: Consumer;
  stream: MediaStream;
};

export type MediaObservable = Observable<{
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
  consumers?: {
    audio?: Consumer;
    video?: Consumer;
    screen?: Consumer;
  };
  signal: Signal;
  isMuted: boolean;
  isTalking: boolean;
}

export interface Message {
  sender: string;
  text:   string;
  // time:   Date;
}
