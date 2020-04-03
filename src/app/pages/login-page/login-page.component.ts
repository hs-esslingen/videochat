import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/helper/api.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {

  email: string;

  constructor(readonly api: ApiService) {
  }

  ngOnInit(): void {
  }

  onLogin() {
    this.api.login(this.email);
  }

}
