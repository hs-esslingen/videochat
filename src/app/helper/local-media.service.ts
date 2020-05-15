import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalMediaService {
  private autoGainControl: boolean;
  private video: MediaStream | undefined;
  private videoLabel: string;
  private audio: MediaStream | undefined;
  private audioLabel: string;
  private capabilities: MediaDeviceInfo[] | undefined;

  constructor() {
    this.videoLabel = window.localStorage.getItem('videoLabel') as string;
    this.audioLabel = window.localStorage.getItem('audioLabel') as string;
    this.autoGainControl = localStorage.getItem('autoGainControl') !== 'false';
  }

  async getAudioCapabilites(): Promise<MediaDeviceInfo[]> {
    // refresh capabilites
    this.capabilities = await navigator.mediaDevices.enumerateDevices();
    return this.capabilities.filter(item => item.kind === 'audioinput');
  }

  async getVideoCapabilites(): Promise<MediaDeviceInfo[]> {
    // refresh capabilites
    this.capabilities = await navigator.mediaDevices.enumerateDevices();
    return this.capabilities.filter(item => item.kind === 'videoinput');
  }

  async getVideoTrack(label?: string, forceUpdate = false) {
    if (label) {
      window.localStorage.setItem('videoLabel', label);
      this.videoLabel = label;
      forceUpdate = true;
    }

    if (!this.video || forceUpdate) {
      this.video?.getVideoTracks().forEach(track => track.stop());

      if (this.capabilities == null) this.capabilities = await navigator.mediaDevices.enumerateDevices();

      const device = this.capabilities.find(item => item.label === this.videoLabel);

      const options: MediaStreamConstraints['video'] = {};
      if (device != null) options.deviceId = device.deviceId;

      this.video = await navigator.mediaDevices.getUserMedia({
        video: options,
      });
    }
    return this.video;
  }

  async getAudioTrack(label?: string, forceUpdate = false) {
    if (label) {
      window.localStorage.setItem('audioLabel', label);
      this.audioLabel = label;
      forceUpdate = true;
    }

    if (!this.audio || forceUpdate) {
      this.audio?.getVideoTracks().forEach(track => track.stop());

      if (this.capabilities == null) this.capabilities = await navigator.mediaDevices.enumerateDevices();

      const device = this.capabilities.find(item => item.label === this.audioLabel);

      const options: MediaStreamConstraints['audio'] = {};
      if (device != null) options.deviceId = device.deviceId;
      options.autoGainControl = this.autoGainControl;

      try {
        this.audio = await navigator.mediaDevices.getUserMedia({
          audio: options,
        });
      } catch (err) {
        const mediaErr = err as MediaStreamError;
        if (mediaErr.message === 'Concurrent mic process limit.') window.location.reload();
        else throw err;
      }
    }
    return this.audio;
  }

  closeAudio() {
    this.audio?.getVideoTracks().forEach(track => track.stop());
    this.audio = undefined;
  }
  closeVideo() {
    this.video?.getVideoTracks().forEach(track => track.stop());
    this.video = undefined;
  }
}
