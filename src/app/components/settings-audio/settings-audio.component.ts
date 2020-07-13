import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {LocalMediaService} from 'src/app/helper/local-media.service';

@Component({
  selector: 'app-settings-audio',
  templateUrl: './settings-audio.component.html',
  styleUrls: ['./settings-audio.component.scss'],
})
export class SettingsAudioComponent implements OnInit {
  @Input() displayAGC!: boolean;
  @Input() disableSelection!: boolean;

  audioDevices: MediaDeviceInfo[] | undefined;
  audioStream: MediaStreamAudioSourceNode | undefined;
  selectedAudioStream: string | undefined;
  autoGainControl!: boolean;

  analyser: AnalyserNode | undefined;
  audioCtx: AudioContext | undefined;
  volume: string | undefined;
  intervalId: number | undefined;

  @Output() audioDevicesEvent = new EventEmitter<MediaDeviceInfo[]>();

  constructor(private localMedia: LocalMediaService) {}

  async ngOnInit() {
    localStorage.getItem('autoGainControl') === 'true' ? (this.autoGainControl = true) : (this.autoGainControl = false);
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
      // ignore error
    }

    this.audioDevices = await this.localMedia.getAudioCapabilites();
    this.audioDevicesEvent.emit(this.audioDevices);
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

  toggleAutoGain(): void {
    this.autoGainControl = !this.autoGainControl;
    if (this.autoGainControl === true) localStorage.setItem('autoGainControl', 'true');
    else localStorage.setItem('autoGainControl', 'false');
  }
}
