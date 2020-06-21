import {Component, OnInit, Input, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'app-settings-user',
  templateUrl: './settings-user.component.html',
  styleUrls: ['./settings-user.component.scss'],
})
export class SettingsUserComponent implements OnInit {
  @Input() nickname!: string;
  @Output() userEvent = new EventEmitter<string>();

  constructor() {}

  ngOnInit(): void {}
}
