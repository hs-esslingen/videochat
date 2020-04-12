import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/helper/api.service';
import { MediaService } from 'src/app/helper/media.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor(readonly api: ApiService, readonly media: MediaService) {
  }

  ngOnInit(): void {
  }

  async logout() {
    await this.media.disconnect();
    this.api.logout();

  }
}
