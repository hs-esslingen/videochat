import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-settings-user',
  templateUrl: './settings-user.component.html',
  styleUrls: ['./settings-user.component.scss'],
})
export class SettingsUserComponent implements OnInit {
  sendOnEnter: boolean;

  constructor() {
    localStorage.getItem('sendOnEnter') === 'true' ? (this.sendOnEnter = true) : (this.sendOnEnter = false);
  }

  ngOnInit(): void {}

  toggleSendOnEnter(value: boolean): void {
    this.sendOnEnter = value;
    localStorage.setItem('sendOnEnter', value.toString());
  }
}
