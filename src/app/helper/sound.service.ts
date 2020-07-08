import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SoundService {
  constructor() {
    console.log('SoundService');
  }

  public playSound(frequency: number | Tone, duration?: number, volumeCurve?: Float32Array | undefined) {
    // let audio = new Audio();
    // audio.src = '../../../assets/audio/alarm.wav';
    // audio.load();
    // audio.play();

    // const context = new AudioContext();
    // const osc = context.createOscillator();
    // osc.type = 'sine';
    // osc.frequency.value = frequency;
    // osc.connect(context.destination);

    // osc.start();
    // stop 0.3 seconds after the current time
    // osc.stop(context.currentTime + 0.2);

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

export enum Tone {
  A = 440,
  B = 493,
  C = 523,
  D = 587,
  E = 659,
}
