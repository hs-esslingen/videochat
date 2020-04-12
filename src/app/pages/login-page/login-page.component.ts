import { Component, OnInit } from '@angular/core';
import { FormControl, Validators, EmailValidator } from '@angular/forms';
import { ApiService } from 'src/app/helper/api.service';
import { promise } from 'protractor';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {
  isEmailSent = false;

  email: FormControl = new FormControl("", [
    Validators.required,
    Validators.pattern(/hs-esslingen.de$/)
  ]);

  constructor(readonly api: ApiService) {
  }

  ngOnInit(): void {
  }


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
}
