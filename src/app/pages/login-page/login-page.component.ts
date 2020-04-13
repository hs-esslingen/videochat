import { Component, OnInit } from "@angular/core";
import { FormControl, Validators, EmailValidator } from "@angular/forms";
import { ApiService } from "src/app/helper/api.service";
import { promise } from "protractor";

@Component({
  selector: "app-login-page",
  templateUrl: "./login-page.component.html",
  styleUrls: ["./login-page.component.scss"],
})
export class LoginPageComponent implements OnInit {
  isEmailSent = false;
  loginWindow: Window;

  email: FormControl = new FormControl("", [
    Validators.required,
    Validators.pattern(/hs-esslingen.de$/),
  ]);

  constructor(readonly api: ApiService) {}

  ngOnInit(): void {}

  async onLogin() {
    if (this.email.valid) {
      this.isEmailSent = true;
      const result = await this.api.login(this.email.value);
      console.log(result);
      if (result && result.token) {
        window.localStorage.setItem("token", result.token);
        this.api.token = result.token;
      }
    }
  }
  async onSSOLogin() {
    if (
      this.loginWindow != undefined ||
      (this.loginWindow && this.loginWindow.closed)
    )
      return;
    const popupWidth = 950;
    const popupHeight = 1150;
    const xPosition = (window.innerWidth - popupWidth) / 2;
    const yPosition = (window.innerHeight - popupHeight) / 2;
    const url = new URL(window.location.href);
    const loginUrl = url.origin + "/login/check-sso";
    localStorage.removeItem("token");
    this.loginWindow = window.open(
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
    const waitForAuthentication = () => {
      setTimeout(async () => {
        try {
          const data = await this.api.checkLogin();
          if (data != undefined && data.token != undefined) {
            this.api.token = data.token;
            if (!this.loginWindow.closed) this.loginWindow.close();
            this.loginWindow = undefined;
          }
        } catch (error) {
          //
        }
        if (this.loginWindow.closed) {
          this.loginWindow = undefined;
          console.log("Error");
          return;
        }
        waitForAuthentication();
      }, 1000);
    };
    waitForAuthentication();
  }
}
