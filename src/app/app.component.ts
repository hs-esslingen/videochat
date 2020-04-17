import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/helper/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'videochat';
  loading = true;

  constructor(private api: ApiService) {

  }
  async ngOnInit(): Promise<void> {
    await this.api.checkLogin();
    this.loading = false;
  }
}
