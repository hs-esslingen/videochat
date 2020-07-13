import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-settings-user',
  templateUrl: './settings-user.component.html',
  styleUrls: ['./settings-user.component.scss'],
})
export class SettingsUserComponent implements OnInit {
  sendOnEnter!: boolean;

  constructor() {}

  ngOnInit(): void {
    localStorage.getItem('sendOnEnter') === 'true' ? (this.sendOnEnter = true) : (this.sendOnEnter = false);
    console.log(this.sendOnEnter);
  }

  toggleSendOnEnter(): void {
    this.sendOnEnter = !this.sendOnEnter;
    if (this.sendOnEnter === true) localStorage.setItem('sendOnEnter', 'true');
    else localStorage.setItem('sendOnEnter', 'false');
  }
}
