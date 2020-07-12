import {Injectable} from '@angular/core';
import {ApiService} from './api.service';

@Injectable({
  providedIn: 'root',
})
export class MoodleService {
  moodleWindow: Window | undefined;

  constructor(private api: ApiService) {}

  async requestURI() {
    const url = new URL(window.location.href);
    navigator.registerProtocolHandler('wtai', url.origin + '/auth/moodle?token=%s', 'HSE-Chat Moodle login');
  }

  getCourses(token: string) {
    return this.api.getMoodleCourses(token);
  }

  async automaticMoodleLogin() {
    return new Promise((resolve, reject) => {
      this.moodleWindow = this.openMoodleLoginWindow('wtai');
      if (this.moodleWindow != null && !this.moodleWindow.closed) return;

      const waitForAuthentication = () => {
        setTimeout(async () => {
          try {
            const token = window.localStorage.getItem('moodleToken');
            if (token) {
              if (!this.moodleWindow?.closed) this.moodleWindow?.close();
              resolve();
              return;
            }
          } catch (error) {
            reject();
          }
          if ((!this.moodleWindow || this.moodleWindow.closed) && window.localStorage.getItem('moodleToken') == null) {
            this.moodleWindow = undefined;
            console.log('Error');
            reject();
            return;
          }
          waitForAuthentication();
        }, 1000);
      };
      waitForAuthentication();
    });
  }

  public openMoodleLoginWindow(urlscheme: string) {
    const popupWidth = 950;
    const popupHeight = 1150;
    const xPosition = (window.innerWidth - popupWidth) / 2;
    const yPosition = (window.innerHeight - popupHeight) / 2;
    const loginUrl = `https://moodle.hs-esslingen.de/moodle/admin/tool/mobile/launch.php?service=local_mobile&urlscheme=${urlscheme}&passport=603.5561786350319`;
    localStorage.removeItem('moodleToken');
    return window.open(
      loginUrl,
      'LoginWindow',
      'location=1,scrollbars=0,' + 'width=' + popupWidth + ',height=' + popupHeight + ',' + 'left=' + xPosition + ',top=' + yPosition
    ) as Window;
  }
}
