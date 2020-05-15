import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../helper/api.service';
import { MediaService } from '../../helper/media.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  constructor(readonly api: ApiService, readonly media: MediaService, readonly router: Router) {
  }

  async ngOnInit(): Promise<void> {
  }

  async logout() {
    await this.media.disconnect();
    this.api.logout();

    this.api.redirectUrl = this.router.url;
    this.router.navigate(['login'])
  }
}
