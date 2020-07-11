import {Injectable} from '@angular/core';
import {MediaService} from './media.service';
import {SignalService} from './signal.service';
import {UserSignal} from '../model/user';

/**
 * provide functionality for user interaction via keyboard shortcuts
 *
 * @export
 * @class ShortcutService
 */
@Injectable({
  providedIn: 'root',
})
export class ShortcutService {
  constructor(private mediaService: MediaService, private signalService: SignalService) {}
  /**
   * trigger different commands on pressing keys
   *
   * @param {KeyboardEvent} event occurs if an key is pressed
   * @memberof ShortcutService
   */
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
