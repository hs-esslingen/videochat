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
    const context = new AudioContext();
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(context.destination);
    osc.start();
    // stop 0.3 seconds after the current time
    osc.stop(context.currentTime + 0.2);
  }
}

// this.mediaService.playSound(600);
