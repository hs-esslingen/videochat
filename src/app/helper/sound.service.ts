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
  constructor() {
    console.log('SoundService');
  }

  /**
   * start playing a sound and stop after duration
   *
   * @param {(number | Tone)} frequency in hertz
   * @param {number} [duration] in seconds
   * @param {(Float32Array | undefined)} [volumeCurve] numbers in intervall [0,1] specifying a smooth volume curve
   * @memberof SoundService
   */
  public playSound(frequency: number | Tone, duration?: number, volumeCurve?: Float32Array | undefined) {
    const audioContext = new AudioContext();

    const osc = audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;

    // Create a gain node and set it's gain value to 1
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1;

    // connect the AudioBufferSourceNode to the gainNode
    // and the gainNode to the destination
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start();

    // provide smooth default volume curve
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

    if (duration === undefined) duration = 1;
    gainNode.gain.setValueCurveAtTime(volumeCurve, audioContext.currentTime, duration);
    osc.stop(duration);
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
