import {Injectable} from '@angular/core';

/**
 * initializes an oscillator for generating sounds
 *
 * @export
 * @class SoundService
 */
@Injectable({
  providedIn: 'root',
})
export class SoundService {
  private audioContext?: AudioContext;
  private osc?: OscillatorNode;
  private gainNode?: GainNode;
  constructor() {}

  /**
   * start playing a sound and stop after duration
   *
   * @param {(number | Tone)} frequency in hertz
   * @param {number} [duration] in seconds
   * @param {(Float32Array | undefined)} [volumeCurve] numbers in intervall [0,1] specifying a smooth volume curve
   * @memberof SoundService
   */
  public async playSound(frequency: number | Tone, duration?: number, volumeCurve?: Float32Array | undefined) {
    try {
      this.audioContext = new AudioContext();
      await this.audioContext.resume();
      this.osc = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();

      // connect the AudioBufferSourceNode to the gainNode
      // and the gainNode to the destination
      this.osc.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      console.log('Playback resumed successfully');
      this.osc.type = 'sine';
      this.osc.frequency.value = frequency;

      // Create a gain node and set it's gain value to 1
      this.gainNode.gain.value = 1;

      this.osc.start();

      if (volumeCurve === undefined) {
        volumeCurve = new Float32Array(7);
        volumeCurve[0] = 0.8;
        volumeCurve[1] = 1;
        volumeCurve[2] = 0.8;
        volumeCurve[3] = 0.7;
        volumeCurve[4] = 0.3;
        volumeCurve[5] = 0.1;
        volumeCurve[6] = 0;
      }

      if (duration === undefined) duration = 0.5;
      this.gainNode.gain.setValueCurveAtTime(volumeCurve, this.audioContext.currentTime, duration);
      this.osc.stop(duration);

      setTimeout(() => {
        this.audioContext?.close();
      }, 500);
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * play sound from audio file
   *
   * @param {string} path e.g. '/assets/audio/join.wav'
   * @memberof SoundService
   */
  public async playAudioFile(path: string) {
    const audio = new Audio();
    audio.src = path;
    audio.load();
    audio.play();
  }
}

/**
 * german tone frequencies, source: https://de.wikipedia.org/wiki/Frequenzen_der_gleichstufigen_Stimmung
 *
 * @export
 * @enum {number}
 */
export enum Tone {
  A1 = 440,
  H1 = 493,
  C2 = 523,
  D2 = 587,
  E2 = 659,
  F2 = 698,
  G2 = 783,
  A2 = 880,
  H2 = 987,
  C3 = 1046,
}
