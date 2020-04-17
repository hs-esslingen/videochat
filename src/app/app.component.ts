import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/helper/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'videochat';
  loading = true;

  constructor(private api: ApiService, private router: Router) {
    this.loading = true;

  }
  async ngOnInit(): Promise<void> {
    await this.api.checkLogin();
    this.router.navigate([this.router.url]);
    this.loading = false;
  }
}
