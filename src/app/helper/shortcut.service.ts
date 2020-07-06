import {Injectable} from '@angular/core';
import {MediaService} from './media.service';
import {SignalService} from './signal.service';
import {UserSignal} from '../model/user';

@Injectable({
  providedIn: 'root',
})
export class ShortcutService {
  constructor(private mediaService: MediaService, private signalService: SignalService) {}
  trigger(event: KeyboardEvent) {
    switch (event.key) {
      case 'm':
        console.log('toggle microphone');
        this.mediaService.toggleMirophone();
        break;
      case 's':
        console.log('toggle share');
        this.mediaService.toggleScreenshare();
        break;
      case 'v':
        console.log('toggle video');
        this.mediaService.toggleCamera();
        break;
      case 'h':
        console.log('Signal raise hand');
        this.signalService.setSignal(UserSignal.RAISED_HAND);
        break;
      case 'd':
        console.log('Signal vote down');
        this.signalService.setSignal(UserSignal.VOTED_DOWN);
        break;
      case 'u':
        console.log('Signal vote up');
        this.signalService.setSignal(UserSignal.VOTED_UP);
        break;
      default:
        console.log('no valid key pressed');
        break;
    }
  }
}
