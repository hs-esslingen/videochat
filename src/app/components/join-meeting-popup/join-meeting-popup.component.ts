import {Component, OnInit, Inject, OnDestroy} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MediaService} from '../../helper/media.service';
import {LocalMediaService} from '../../helper/local-media.service';

interface JoinMeetingData {
  roomId: string;
  nickname: string;
}

@Component({
  selector: 'app-join-meeting-popup',
  templateUrl: './join-meeting-popup.component.html',
  styleUrls: ['./join-meeting-popup.component.scss'],
})
export class JoinMeetingPopupComponent implements OnInit, OnDestroy {
  analyser: AnalyserNode | undefined;
  audioCtx: AudioContext | undefined;
  volume: string | undefined;
  videoTrack: MediaStream | undefined;
  intervalId: number | undefined;

  videoDevices: MediaDeviceInfo[] | undefined;
  audioDevices: MediaDeviceInfo[] | undefined;

  audioStream: MediaStreamAudioSourceNode | undefined;

  selectedAudioStream: string | undefined;
  selectedVideoStream: string | undefined;

  constructor(
    public dialogRef: MatDialogRef<JoinMeetingPopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: JoinMeetingData,
    private media: MediaService,
    private localMedia: LocalMediaService
  ) {
    dialogRef.disableClose = true;
  }

  close(): void {
    if (this.audioDevices != null) {
      clearInterval(this.intervalId);
      this.dialogRef.close({
        nickname: this.data.nickname,
        isWebcamDisabled: this.selectedVideoStream === 'none',
      });
    }
  }

  async ngOnInit() {
    console.log('ng-init');

    console.log('get capabilities');
    this.videoDevices = await this.localMedia.getVideoCapabilites();
    this.audioDevices = await this.localMedia.getAudioCapabilites();
    try {
      console.log('get video');
      const videoStream = await this.localMedia.getVideoTrack();
      const videoTracks = videoStream.getVideoTracks();
      this.videoTrack = new MediaStream(videoTracks);
      if (videoTracks.length > 0) {
        this.selectedVideoStream = videoTracks[0].label;
      }
    } catch (error) {
      console.error(error);
      this.selectedVideoStream = 'none';
    }

    try {
      console.log('get audio');
      this.audioCtx = new AudioContext();
      this.analyser = this.audioCtx.createAnalyser();
      const audioStream = await this.localMedia.getAudioTrack();
      if (audioStream) {
        const audio = audioStream.getAudioTracks()[0];
        this.audioStream = this.audioCtx.createMediaStreamSource(audioStream);

        this.audioStream.connect(this.analyser);

        const array = new Uint8Array(this.analyser.fftSize);

        // @ts-ignore
        this.intervalId = setInterval(() => {
          this.analyser?.getByteTimeDomainData(array);
          const volume = Math.max(0, Math.max(...array) - 128) / 128;
          this.volume = volume * 100 + '%';
        }, 100);

        this.selectedAudioStream = audio.label;
      }
    } catch (error) {
      console.error(error);
      // ingore error
    }
    console.log('getting capabilities (again)');
    this.videoDevices = await this.localMedia.getVideoCapabilites();
    this.audioDevices = await this.localMedia.getAudioCapabilites();
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }

  async changeVideoStream(label: string) {
    const videoTracks = this.videoTrack?.getVideoTracks();
    if (videoTracks && videoTracks.length > 0) videoTracks[0].stop();
    if (label === 'none') {
      this.videoTrack = undefined;
      this.selectedVideoStream = 'none';
      this.localMedia.closeVideo();
      return;
    }
    const video = await this.localMedia.getVideoTrack(label);

    const newVideoTracks = video.getVideoTracks();
    this.videoTrack = video;
    if (newVideoTracks.length > 0) this.selectedVideoStream = newVideoTracks[0].label;
  }

  async changeAudioStream(label: string) {
    try {
      this.audioStream?.disconnect(this.analyser as AnalyserNode);
    } catch (error) {
      // ignore error
    }

    const audio = await this.localMedia.getAudioTrack(label);

    this.audioStream = this.audioCtx?.createMediaStreamSource(audio as MediaStream);
    this.audioStream?.connect(this.analyser as AnalyserNode);
  }
}
