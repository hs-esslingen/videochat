import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SoundService {
  constructor() {
    console.log('SoundService');
  }

  public playSound(frequency: number) {
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

    // Create a gain node and set it's gain value to 0.5
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.5;

    // connect the AudioBufferSourceNode to the gainNode
    // and the gainNode to the destination
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    osc.start();

    const volumeCurve = new Float32Array(9);
    volumeCurve[0] = 0.8;
    volumeCurve[1] = 1;
    volumeCurve[2] = 0.8;
    volumeCurve[3] = 0.7;
    volumeCurve[4] = 0.3;
    volumeCurve[5] = 0.1;
    volumeCurve[6] = 0;

    gainNode.gain.setValueCurveAtTime(volumeCurve, audioContext.currentTime, 1);
    osc.stop(1);
  }
}
