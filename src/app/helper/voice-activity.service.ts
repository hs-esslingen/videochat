import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VoiceActivityService {
  private audioCtx?: AudioContext;
  constructor() {}

  public async init(audiotracks: MediaStream) {
    if (this.audioCtx != null) {
      this.audioCtx.close();
    }
    this.audioCtx = new AudioContext();
    await this.audioCtx.resume();
    const audiosrc = this.audioCtx.createMediaStreamSource(audiotracks);
    await this.audioCtx.audioWorklet.addModule('/assets/js/voice-meter-processor.js');
    const voiceActivityNode = new AudioWorkletNode(this.audioCtx, 'voice-meter-processor');
    audiosrc.connect(voiceActivityNode);
    voiceActivityNode.port.onmessage = e => {
      console.log(e.data);
    };
    //@ts-ignore
    window.test = voiceActivityNode.parameters;
    const volumeLevel = ((voiceActivityNode.parameters as unknown) as Map<string, {value: number; maxValue: number; minValue: number}>).get('volumeLevel');
    console.log(volumeLevel);

    if (volumeLevel) volumeLevel.value = 0.04;
    const mediaStreamNode = new MediaStreamAudioDestinationNode(this.audioCtx);
    console.log(voiceActivityNode);
    voiceActivityNode.connect(mediaStreamNode);
    voiceActivityNode.connect(this.audioCtx.destination);
    // mediaStreamNode.connect(this.audioCtx.destination);
    console.log(mediaStreamNode);
    console.log(mediaStreamNode.stream.getAudioTracks());
    return mediaStreamNode.stream;
  }

  public close() {
    this.audioCtx?.close();
    this.audioCtx = undefined;
  }
}
