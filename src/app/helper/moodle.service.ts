import { Injectable } from "@angular/core";
import { ApiService } from "./api.service";

@Injectable({
  providedIn: "root",
})
export class MoodleService {
  moodleWindow: Window;

  constructor(private api: ApiService) {}

  async requestURI() {
    navigator.registerProtocolHandler(
      "wtai",
      "http://localhost:4200/auth/moodle?token=%s",
      "HSE-Chat Moodle login"
    );
  }

  async moodleLogin() {
    return new Promise((res, rej) => {
      if (
        this.moodleWindow != undefined ||
        (this.moodleWindow && this.moodleWindow.closed)
      ) {
        this.openMoodleLoginWindow();
        return;
      }
      this.openMoodleLoginWindow();
      const waitForAuthentication = () => {
        setTimeout(async () => {
          try {
            const token = await window.localStorage.getItem("moodleToken");
            if (token) {
              if (!this.moodleWindow.closed) this.moodleWindow.close();
              res();
              return;
            }
          } catch (error) {
            rej();
          }
          if (!this.moodleWindow || this.moodleWindow.closed) {
            this.moodleWindow = undefined;
            console.log("Error");
            return;
          }
          waitForAuthentication();
        }, 1000);
      };
      waitForAuthentication();
    });
  }

  private openMoodleLoginWindow() {
    const popupWidth = 950;
    const popupHeight = 1150;
    const xPosition = (window.innerWidth - popupWidth) / 2;
    const yPosition = (window.innerHeight - popupHeight) / 2;
    const url = new URL(window.location.href);
    const loginUrl =
      "https://moodle.hs-esslingen.de/moodle/admin/tool/mobile/launch.php?service=local_mobile&urlscheme=wtai&passport=603.5561786350319";
    localStorage.removeItem("moodleToken");
    this.moodleWindow = window.open(
      loginUrl,
      "LoginWindow",
      "location=1,scrollbars=0," +
        "width=" +
        popupWidth +
        ",height=" +
        popupHeight +
        "," +
        "left=" +
        xPosition +
        ",top=" +
        yPosition
    );
  }
}
