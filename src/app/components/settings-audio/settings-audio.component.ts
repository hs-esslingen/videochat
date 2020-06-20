import { Component, OnInit, Input } from '@angular/core';
import { LocalMediaService } from 'src/app/helper/local-media.service';
import { MediaService } from 'src/app/helper/media.service';

@Component({
  selector: 'app-settings-audio',
  templateUrl: './settings-audio.component.html',
  styleUrls: ['./settings-audio.component.scss']
})

export class SettingsAudioComponent implements OnInit {
  @Input() autoGainControl!: boolean;                                 //Checked
  @Input() mediaService!: MediaService;                               //Checked

  analyser: AnalyserNode | undefined;
  audioCtx: AudioContext | undefined;

  volume: string | undefined;
  audioDevices: MediaDeviceInfo[] | undefined;
  audioStream: MediaStreamAudioSourceNode | undefined;
  selectedAudioStream: string | undefined;
  intervalId: number | undefined;

  constructor(
    private localMedia: LocalMediaService,
  ) { }

  async ngOnInit() {
    this.audioCtx = new AudioContext();
    
    try {
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
      // ingore error
    }

    //console.log(this.localMedia);
    this.audioDevices = await this.localMedia.getAudioCapabilites();
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
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

  close(): void {
    if (this.audioDevices != null) {
      clearInterval(this.intervalId);
      // Return values;
    }
  }

  toggleAutoGain(): void {
    this.mediaService.toggleAutoGainControl();
  }
}
