import { Component, OnInit } from "@angular/core";
import { FormControl, Validators } from "@angular/forms";
import { ApiService } from "../../helper/api.service";
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: "app-login-page",
  templateUrl: "./login-page.component.html",
  styleUrls: ["./login-page.component.scss"],
})
export class LoginPageComponent implements OnInit {
  isEmailSent = false;
  loginWindow: Window;
  prodction: boolean;

  email: FormControl = new FormControl("", [
    Validators.required,
    Validators.pattern(/hs-esslingen.de$/),
  ]);

  constructor(readonly api: ApiService, readonly router: Router) {}

  ngOnInit(): void {
    this.prodction = environment.production;
    if (this.api.isLoggedIn) {
      this.router.navigate(['']);
    }
  }

  async onLogin() {
    if (this.email.valid) {
      this.isEmailSent = true;
      const result = await this.api.emailLogin(this.email.value);
      console.log(result);
      // If the application is in debug mode a token will be returned immediately
      if (result && result.token) {
        window.localStorage.setItem("token", result.token);
        this.api.token = result.token;
        await this.api.jwtLogin();
        if (this.api.redirectUrl)
          this.router.navigate([this.api.redirectUrl]);
        else
          this.router.navigate(['']);
      }
    }
  }
  async onSSOLogin() {
    if (
      this.loginWindow != undefined ||
      (this.loginWindow && this.loginWindow.closed)
    ) {
      this.openLoginWindow();
      return;
    }
    this.openLoginWindow();
    const waitForAuthentication = () => {
      setTimeout(async () => {
        try {
          const response = await this.api.checkLogin();
          if (response) {
            if (!this.loginWindow.closed) this.loginWindow.close();
            if (this.api.redirectUrl)
            this.router.navigate([this.api.redirectUrl]);
            else
            this.router.navigate(['']);
            this.loginWindow = undefined;
            return;
          }
        } catch (error) {
          //
        }
        if (!this.loginWindow || this.loginWindow.closed) {
          this.loginWindow = undefined;
          console.log("Error");
          return;
        }
        waitForAuthentication();
      }, 1000);
    };
    waitForAuthentication();
  }

  openLoginWindow() {
    const popupWidth = 950;
    const popupHeight = 1150;
    const xPosition = (window.innerWidth - popupWidth) / 2;
    const yPosition = (window.innerHeight - popupHeight) / 2;
    const url = new URL(window.location.href);
    const loginUrl = url.origin + "/auth/check-sso";
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
  }
}
