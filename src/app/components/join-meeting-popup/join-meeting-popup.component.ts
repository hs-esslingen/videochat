import { Component, OnInit, Inject, OnDestroy } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MediaService } from "../../helper/media.service";
import { LocalMediaService } from "../../helper/local-media.service";

interface JoinMeetingData {
  roomId: string;
  nickname: string;
}

@Component({
  selector: "app-join-meeting-popup",
  templateUrl: "./join-meeting-popup.component.html",
  styleUrls: ["./join-meeting-popup.component.scss"],
})
export class JoinMeetingPopupComponent implements OnInit, OnDestroy {
  analyser: AnalyserNode;
  audioCtx: AudioContext;
  volume: string;
  videoTrack: MediaStream;
  intervalId: number;

  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];

  audioStream: MediaStreamAudioSourceNode;

  selectedAudioStream: string;
  selectedVideoStream: string;

  constructor(
    public dialogRef: MatDialogRef<JoinMeetingPopupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: JoinMeetingData,
    private media: MediaService,
    private localMedia: LocalMediaService
  ) {
    dialogRef.disableClose = true;
  }

  close(): void {
    if (this.audioDevices != undefined) {
      clearInterval(this.intervalId);
      this.dialogRef.close({
        nickname: this.data.nickname,
        isWebcamDisabled: this.selectedVideoStream === "none",
      });
    }
  }

  async ngOnInit() {
    this.audioCtx = new AudioContext();

    try {
      const videoStream = await this.localMedia.getVideoTrack();
      const videoTracks = videoStream.getVideoTracks();
      this.videoTrack = new MediaStream(videoTracks);
      if (videoTracks.length > 0) {
        this.selectedVideoStream = videoTracks[0].label;
      }
    } catch (error) {
      this.selectedVideoStream = "none";
    }

    try {
      this.analyser = this.audioCtx.createAnalyser();
      const audioStream = await this.localMedia.getAudioTrack();
      const audio = audioStream.getAudioTracks()[0];
      this.audioStream = this.audioCtx.createMediaStreamSource(audioStream);

      this.audioStream.connect(this.analyser);

      const array = new Uint8Array(this.analyser.fftSize);

      // @ts-ignore
      this.intervalId = setInterval(() => {
        this.analyser.getByteTimeDomainData(array);
        const volume = Math.max(0, Math.max(...array) - 128) / 128;
        this.volume = volume * 100 + "%";
      }, 100);

      this.selectedAudioStream = audio.label;
    } catch (error) {}

    this.videoDevices = await this.localMedia.getVideoCapabilites();
    this.audioDevices = await this.localMedia.getAudioCapabilites();
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }

  async changeVideoStream(label: string) {
    if (this.videoTrack?.getVideoTracks().length > 0)
      this.videoTrack.getVideoTracks()[0].stop();
    if (label === "none") {
      this.videoTrack = undefined;
      this.selectedVideoStream = "none";
      this.localMedia.closeVideo();
      return;
    }
    const video = await this.localMedia.getVideoTrack(label);

    const newVideoTracks = video.getVideoTracks();
    this.videoTrack = video;
    if (newVideoTracks.length > 0)
      this.selectedVideoStream = newVideoTracks[0].label;
  }

  async changeAudioStream(label: string) {
    try {
      this.audioStream.disconnect(this.analyser);
    } catch (error) {}

    const audio = await this.localMedia.getAudioTrack(label);

    this.audioStream = this.audioCtx.createMediaStreamSource(audio);
    this.audioStream.connect(this.analyser);
  }
}
