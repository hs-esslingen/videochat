import {Component, OnInit} from '@angular/core';
import {ApiService} from '../../helper/api.service';
import {Router} from '@angular/router';
import {RoomService} from 'src/app/helper/room.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  constructor(readonly api: ApiService, readonly room: RoomService, readonly router: Router) {}

  async ngOnInit(): Promise<void> {}

  async logout() {
    await this.room.disconnect();
    this.api.logout();

    this.api.redirectUrl = this.router.url;
    this.router.navigate(['login']);
  }
}
