/* eslint-disable no-async-promise-executor */
import {Injectable} from '@angular/core';
import {Consumer, Producer, Device, Transport} from 'mediasoup-client/lib/types';
import {ApiService} from './api.service';
import {Subject} from 'rxjs';
import {WsService} from './ws.service';
import {LocalMediaService} from './local-media.service';
import {User, MicrophoneState, CameraState, ScreenshareState} from '../model/user';
import {State} from '../model/connection';
import {SoundService} from './sound.service';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private device!: Device;
  private localVideoProducer: Producer | undefined;
  get LocalVideoProducer(): Producer | undefined {
    return this.localVideoProducer;
  }
  private localScreenProducer: Producer | undefined;
  get LocalScreenProducer(): Producer | undefined {
    return this.localScreenProducer;
  }
  private localAudioProducer: Producer | undefined;
  get LocalAudioProducer(): Producer | undefined {
    return this.localAudioProducer;
  }
  mediaSubject: Subject<{
    autoGainControl: boolean;
    cameraState: CameraState;
    microphoneState: MicrophoneState;
    screenshareState: ScreenshareState;
    localStream?: MediaStream;
    localScreenshareStream?: MediaStream;
    users: {[key: string]: User};
  }>;
  private recvTransport!: Transport;
  private sendTransport!: Transport;
  private state: State = State.DISCONNECTED;
  private autoGainControl: boolean;
  private microphoneState: MicrophoneState | undefined;
  private cameraState: CameraState | undefined;
  private screenshareState: ScreenshareState = ScreenshareState.DISABLED;
  private localStream: MediaStream | undefined;
  private localScreenshareStream: MediaStream | undefined;
  private startingCameraStream = false;
  private roomId: string | undefined;
  private users: {[key: string]: User} = {};
  private userId: string | undefined;
  private audioIntervalId = 0;
  private audioCtx?: AudioContext;
  private currentlyAdding: {[key: string]: string} = {};

  public nickname: string;

  constructor(private api: ApiService, private ws: WsService, private localMedia: LocalMediaService, private sound: SoundService) {
    this.autoGainControl = localStorage.getItem('autoGainControl') !== 'false';
    this.nickname = localStorage.getItem('nickname') as string;
    this.mediaSubject = new Subject();
  }

  public async init(roomId: string, isWebcamDisabled: boolean, userId: string): Promise<void> {
    this.state = State.CONNECTING;
    this.userId = userId;
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

    await this.setupAudio();

    this.state = State.CONNECTED;

    this.addExistingUsers();

    // Push an inital update
    setTimeout(() => {
      this.triggerSubject();
    }, 500);
  }

  async setupAudio() {
    try {
      const audioTracks = await this.localMedia.getAudioTrack();
      if (audioTracks && audioTracks.getAudioTracks().length > 0) {
        this.microphoneState = MicrophoneState.ENABLED;
        await this.sendAudio(audioTracks);

        try {
          this.audioCtx = new AudioContext();
          const analyser = this.audioCtx.createAnalyser();
          analyser.fftSize = 2048;
          const audioStream = this.audioCtx.createMediaStreamSource(audioTracks);
          audioStream.connect(analyser);
          const array = new Uint8Array(analyser.fftSize);

          if (this.audioIntervalId) clearInterval(this.audioIntervalId);
          this.audioIntervalId = (setInterval(() => {
            analyser?.getByteTimeDomainData(array);
            const volume = Math.max(0, Math.max(...array) - 128) / 128;
            // convert to logarythmic, this will this will represent actual volume better
            const perceivedVolume = Math.sqrt(volume);
            if (perceivedVolume > 0.1 && this.microphoneState === MicrophoneState.ENABLED) {
              this.microphoneState = MicrophoneState.TALKING;
              this.api.setMicrophoneState(this.roomId as string, this.microphoneState);
              this.triggerSubject();
            } else if (perceivedVolume < 0.1 && this.microphoneState === MicrophoneState.TALKING) {
              this.microphoneState = MicrophoneState.ENABLED;
              this.api.setMicrophoneState(this.roomId as string, this.microphoneState);
              this.triggerSubject();
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }, 500) as any) as number;
        } catch (error) {
          console.log('error creating audio context');
        }
        this.api.setMicrophoneState(this.roomId as string, this.microphoneState);
      } else {
        this.microphoneState = MicrophoneState.DISABLED;
        this.api.setMicrophoneState(this.roomId as string, this.microphoneState);
      }
    } catch (error) {
      console.log('AUDIO ERROR');
      this.microphoneState = MicrophoneState.DISABLED;
    }
  }

  setNickname(nickname: string) {
    this.nickname = nickname;
    window.localStorage.setItem('nickname', nickname);
    this.ws.send('update', {nickname});
    this.triggerSubject();
  }

  async toggleMirophone() {
    if (this.state !== State.CONNECTED) return;
    if (this.localAudioProducer == null || this.localAudioProducer.closed) {
      await this.setupAudio();
    }
    if (this.localAudioProducer?.paused) {
      this.localAudioProducer.resume();
      this.microphoneState = MicrophoneState.ENABLED;
      this.api.setMicrophoneState(this.roomId as string, this.microphoneState);
      // Todo: add sound in settings menu
      // play higher pitch on unmuting microphone
      // this.sound.playSound(Tone.C2, 0.3);
    } else {
      this.localAudioProducer?.pause();
      this.microphoneState = MicrophoneState.DISABLED;
      this.api.setMicrophoneState(this.roomId as string, this.microphoneState);
      // Todo: add sound in settings menu
      // play lower sound on muting microphone
      // this.sound.playSound(Tone.A1, 0.3);
    }
    this.triggerSubject();
  }

  async toggleCamera() {
    if (this.state !== State.CONNECTED) return;
    if (this.localVideoProducer != null && !this.localVideoProducer?.closed) {
      this.localMedia.closeVideo();
      this.localVideoProducer.close();
      await this.api.producerClose(this.roomId as string, this.localVideoProducer.id);
      this.cameraState = CameraState.DISABLED;
      this.localStream = undefined;
    } else {
      if (!this.startingCameraStream)
        try {
          this.startingCameraStream = true;
          this.cameraState = CameraState.ENABLED;
          this.triggerSubject();
          const mediaStream = await this.localMedia.getVideoTrack();
          this.localStream = mediaStream;
          this.triggerSubject();
          await this.sendVideo(mediaStream);

          setTimeout(() => {
            this.startingCameraStream = false;
          }, 500);
        } catch (e) {
          console.error(e);
          this.cameraState = CameraState.DISABLED;
          this.triggerSubject();
          setTimeout(() => {
            this.startingCameraStream = false;
          }, 500);
          this.localStream = undefined;
        }
    }
    this.triggerSubject();
  }

  // public async setCamera(isWebcamDisabled: boolean): Promise<void> {
  //   if (!isWebcamDisabled) {
  //     const videoTracks = await this.localMedia.getVideoTrack();
  //     this.localStream = new MediaStream(videoTracks.getVideoTracks());
  //     if (videoTracks.getVideoTracks().length > 0) {
  //       this.cameraState = CameraState.ENABLED;
  //       await this.sendVideo(videoTracks);
  //     } else {
  //       this.cameraState = CameraState.DISABLED;
  //     }
  //   } else {
  //     if (this.localVideoProducer != null && !this.localVideoProducer?.closed) {
  //       this.localMedia.closeVideo();
  //       this.localVideoProducer.close();
  //       await this.api.producerClose(this.roomId as string, this.localVideoProducer.id);
  //       this.cameraState = CameraState.DISABLED;
  //       this.localStream = undefined;
  //     }
  //   }

  //   // Push an inital update
  //   setTimeout(() => {
  //     this.triggerSubject();
  //   }, 500);
  // }

  toggleAutoGainControl() {
    console.log('toggle: autoGainControl');
    localStorage.setItem('autoGainControl', (!this.autoGainControl).toString());
    this.autoGainControl = !this.autoGainControl;
  }

  async toggleScreenshare() {
    if (this.state !== State.CONNECTED) return;
    console.log('toggle: screenshare');
    if (this.localScreenProducer === undefined || this.localScreenProducer.closed) {
      // start screenshare
      try {
        // @ts-ignore
        const localScreen = (await navigator.mediaDevices.getDisplayMedia({})) as MediaStream;
        this.localScreenshareStream = localScreen;

        await this.sendScreen(localScreen);
        this.screenshareState = ScreenshareState.ENABLED;

        if (this.localScreenProducer?.track)
          this.localScreenProducer.track.onended = async () => {
            setTimeout(() => {
              if (this.screenshareState !== ScreenshareState.DISABLED) this.toggleScreenshare();
            }, 0);
          };
        this.triggerSubject();
      } catch (e) {
        console.error(e);
      }
    } else if (this.localScreenshareStream) {
      // stop screenshare
      const screenshareTracks = this.localScreenshareStream.getVideoTracks();
      if (screenshareTracks.length > 0) {
        await this.api.producerClose(this.roomId as string, this.localScreenProducer.id);
      }
      setTimeout(async () => {
        screenshareTracks[0].stop();
        this.screenshareState = ScreenshareState.DISABLED;
        this.localScreenshareStream = undefined;
        this.localScreenProducer?.close();
        this.localScreenProducer = undefined;
        this.triggerSubject();
      }, 100);
    }
  }

  triggerSubject() {
    if (this.mediaSubject)
      this.mediaSubject.next({
        autoGainControl: this.autoGainControl,
        microphoneState: this.microphoneState as MicrophoneState,
        screenshareState: this.screenshareState,
        cameraState: this.cameraState as CameraState,
        localStream: this.localStream,
        localScreenshareStream: this.localScreenshareStream,
        users: this.users,
      });
  }

  async restartIce() {
    if (this.sendTransport != null) {
      const iceParameters = await this.api.restartIce(this.roomId as string, this.sendTransport.id);
      this.sendTransport.restartIce({iceParameters});
    }
    if (this.recvTransport != null) {
      const iceParameters = await this.api.restartIce(this.roomId as string, this.recvTransport.id);
      this.recvTransport.restartIce({iceParameters});
    }
  }

  private setStatusConnecting() {
    this.state = State.CONNECTING;
  }

  private async setupDevice() {
    this.device = new Device();
    const routerRtpCapabilities = await this.api.getCapabilities(this.roomId as string);
    await this.device.load({routerRtpCapabilities});
  }

  private setupWebsocket() {
    this.ws.messageSubject?.subscribe(msg => {
      switch (msg.type) {
        case 'add-user':
          {
            if (this.recvTransport == null || this.recvTransport.id == null) return;

            const user: User = msg.data;
            if (!this.users[user.id]) {
              this.users[user.id] = user;
              this.triggerSubject();
            }
          }
          break;
        case 'disconnect-user':
        case 'update-user':
          {
            const user: User = msg.data;
            const foundUser = this.users[user.id];
            if (foundUser) {
              this.users[user.id] = Object.assign(foundUser, user);

              if (foundUser.consumers == null) foundUser.consumers = {};

              ['audio', 'video', 'screen'].forEach(type => {
                // add missing producers
                if (
                  foundUser.consumers &&
                  foundUser.consumers[type as 'audio' | 'video' | 'screen'] == null &&
                  foundUser.producers[type as 'audio' | 'video' | 'screen'] != null
                )
                  this.addConsumer(foundUser, type as 'audio' | 'video' | 'screen');

                // remove old producers
                if (
                  foundUser.consumers &&
                  foundUser.consumers[type as 'audio' | 'video' | 'screen'] != null &&
                  foundUser.producers[type as 'audio' | 'video' | 'screen'] == null
                )
                  this.removeConsumer(foundUser, type as 'audio' | 'video' | 'screen');
              });
              this.triggerSubject();
            }
          }
          break;
        case 'restart-ice':
          {
            // restarting ice
            this.restartIce();
          }
          break;
        case 'remove-producer':
          {
            console.log('REOMVING PRODUCER');
            if (msg.data.id === this.localScreenProducer?.id) {
              this.screenshareState = ScreenshareState.DISABLED;
              this.localScreenProducer?.close();
              this.localScreenProducer = undefined;
              this.triggerSubject();
            } else if (msg.data.id === this.localAudioProducer?.id) {
              this.microphoneState = MicrophoneState.DISABLED;
              this.localAudioProducer?.close();
              this.localAudioProducer = undefined;
              clearInterval(this.audioIntervalId);
              this.audioCtx?.close();
              this.triggerSubject();
            }
          }
          break;
        default:
          break;
      }
    });
  }

  async addExistingUsers() {
    const users = await this.api.getUsers(this.roomId as string);
    const promises: Promise<void>[] = [];
    for (const user of users) {
      promises.push(
        new Promise(async res => {
          // Don't add yourself
          if (user.id === this.userId) return res();

          const foundUser = this.users[user.id];
          if (foundUser) {
            console.log('User already exits ... updating');
            for (const _type of ['audio', 'video', 'screen']) {
              const type = _type as 'audio' | 'video' | 'screen';
              // remove old producers
              if (
                (foundUser.consumers && foundUser.consumers[type] != null && user.producers[type] == null) ||
                user.producers[type] !== foundUser.producers[type]
              )
                await this.removeConsumer(foundUser, type);
              // add missing producers
              if (
                (foundUser.consumers && foundUser.consumers[type] == null && user.producers[type] != null) ||
                (user.producers[type] != null && user.producers[type] !== foundUser.producers[type])
              )
                await this.addConsumer(foundUser, type);
              this.users[user.id] = Object.assign(foundUser, user);
            }
            return res();
          }
          this.users[user.id] = user;

          for (const key in user.producers) {
            if (Object.prototype.hasOwnProperty.call(user.producers, key)) {
              await this.addConsumer(user, key as 'audio' | 'video' | 'screen');
            }
          }
          res();
        })
      );
    }
    await Promise.all(promises);
    this.triggerSubject();
  }

  private async addConsumer(user: User, type: 'audio' | 'video' | 'screen') {
    const producerId = user.producers[type];
    if (
      producerId == null ||
      producerId === this.localVideoProducer?.id ||
      producerId === this.localAudioProducer?.id ||
      producerId === this.localScreenProducer?.id ||
      this.currentlyAdding[producerId] != null
    )
      return;
    console.log('ADDING: ' + type);

    this.currentlyAdding[producerId] = producerId;

    const consume = await this.api.addConsumer(this.roomId as string, this.recvTransport.id, this.device.rtpCapabilities, producerId as string);

    console.log('getting consumer');
    const consumer: Consumer = await new Promise(async res => {
      const consumer = await this.recvTransport.consume({
        id: consume.id,
        kind: type === 'audio' ? 'audio' : 'video',
        producerId,
        rtpParameters: consume.rtpParameters,
      });
      console.log('got consumer');
      res(consumer);
    });

    if (!user.consumers) user.consumers = {};
    user.consumers[type] = consumer;

    await this.api.resume(this.roomId as string, consume.id);
    console.log('resume');

    this.triggerSubject();

    consumer.on('transportclose', () => {
      console.log('track close');
      this.removeConsumer(user, type);
    });
    consumer.on('trackended', () => {
      console.log('track ended');
      this.removeConsumer(user, type);
    });
    delete this.currentlyAdding[producerId];
  }

  private removeConsumer(user: User, type: 'audio' | 'video' | 'screen') {
    if (!user.consumers || !user.consumers[type]) return;

    user.consumers[type]?.close();
    user.consumers[type] = undefined;
    this.triggerSubject();
  }

  private async createSendTransport() {
    const params = await this.api.getCreateTransport(this.roomId as string);
    this.sendTransport = this.device.createSendTransport(params);
    this.sendTransport.on('connectionstatechange', c => {
      console.log('connection state: ' + c);
      if (c === 'disconnected') {
        // Ping server if he is still responding, otherwise reconnect
        // May not be needed, because ws are already used to check if the connection failed
      }
    });
    this.addProduceCallbacks(this.sendTransport);
  }

  private async createRecvTransport() {
    const params = await this.api.getCreateTransport(this.roomId as string);
    this.recvTransport = this.device.createRecvTransport(params);
    this.recvTransport.on('connectionstatechange', c => {
      console.log('connection state: ' + c);
    });
    this.addProduceCallbacks(this.recvTransport);
  }

  private async sendVideo(localStream: MediaStream) {
    this.localVideoProducer = await this.sendTransport.produce({
      track: localStream.getVideoTracks()[0],
      encodings: [
        {maxBitrate: 680000, scaleResolutionDownBy: 1},
        // The switching seams to fail in firefox and is not supported in hardware encoders
        // { maxBitrate: 96000, scaleResolutionDownBy: 4 },
      ],
      appData: {type: 'video'},
    });
  }

  private async sendScreen(localStream: MediaStream) {
    const codec = this.device?.rtpCapabilities.codecs?.find(item => item.mimeType.includes('VP8'));
    this.localScreenProducer = await this.sendTransport.produce({
      track: localStream.getVideoTracks()[0],
      codec,
      encodings: [{maxBitrate: 6800000, scaleResolutionDownBy: 1}],
      appData: {type: 'screen'},
    });
  }

  private async sendAudio(localStream: MediaStream) {
    const track = localStream.getAudioTracks()[0];
    this.localAudioProducer = await this.sendTransport.produce({
      track,
      appData: {type: 'audio'},
    });
  }

  private addProduceCallbacks(transport: Transport) {
    transport.on('connect', async ({dtlsParameters}, callback, errback) => {
      // Signal local DTLS parameters to the server side transport.
      try {
        await this.api.connect(this.roomId as string, transport.id, dtlsParameters);
        // Tell the transport that parameters were transmitted.
        callback();
      } catch (error) {
        // Tell the transport that something was wrong.
        console.error(error);
        errback(error);
      }
    });

    transport.on('produce', async (parameters, callback, errback) => {
      console.log('PRODUCE');
      try {
        const {id} = await this.api.produce(this.roomId as string, transport.id, parameters.kind, parameters.rtpParameters, parameters.appData);
        callback({id});
      } catch (err) {
        console.error(err);
        errback();
      }
    });
  }

  public async disconnect() {
    if (this.state !== State.CONNECTING) {
      this.recvTransport?.close();
      this.sendTransport?.close();
      if (this.localAudioProducer?.closed === false) this.localAudioProducer?.close();
      if (this.localVideoProducer?.closed === false) this.localVideoProducer?.close();
      this.users = {};
      this.localVideoProducer = undefined;
      this.localScreenshareStream = undefined;
      this.screenshareState = ScreenshareState.DISABLED;
      clearInterval(this.audioIntervalId);
      this.audioCtx?.close();
      this.audioCtx = undefined;
    }
    this.state = State.DISCONNECTED;
  }
}

export type Stream = {
  consumer: Consumer;
  stream: MediaStream;
};

export interface WebsocketUserInfo {
  nickname?: string;
  producers: {
    audio?: string;
    video?: string;
    screen?: string;
  };
}
