import {Component, OnInit, Input} from '@angular/core';
import {Chat} from '../../helper/chat.service';
import { User } from 'src/app/helper/user.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  @Input() childData!: Chat;
  @Input() user!: User;

  constructor() {}

  ngOnInit(): void {}

  sendMessage(): void {
    console.log('Message sent!');
  }
}
