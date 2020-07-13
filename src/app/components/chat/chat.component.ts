import {Component, OnInit, Input, ViewChild, ElementRef, Output, EventEmitter} from '@angular/core';
import {ChatService} from '../../helper/chat.service';
import {User, CurrentUser} from 'src/app/model/user';
import {Chat} from 'src/app/model/chat';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit {
  @Input() childData!: Chat;
  @Input() currentUser?: CurrentUser;
  @Input() users: {[id: string]: User} = {};

  newMessage?: string;
  sendOnEnter!: boolean;
  sendButtonTooltip!: string;

  @Output() closeChatEvent = new EventEmitter<{element: Chat; type: 'chat'}>();

  @ViewChild('input') input!: ElementRef<HTMLTextAreaElement>;

  handleKeyDown(event: KeyboardEvent) {
    if (this.sendOnEnter) {
      if (event.key === 'Enter' && !event.shiftKey) {
        this.sendMessage();
        event.preventDefault();
      }
    } else {
      if (event.key === 'Enter' && event.shiftKey) {
        this.sendMessage();
        event.preventDefault();
      }
    }
  }

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    localStorage.getItem('sendOnEnter') === 'true' ? (this.sendOnEnter = true) : (this.sendOnEnter = false);
    if (this.sendOnEnter) this.sendButtonTooltip = 'Send (Enter)';
    else this.sendButtonTooltip = 'Send (Shift + Enter)';
  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    this.input.nativeElement.focus();
  }

  deleteChat(): void {
    this.closeChatEvent.emit({element: this.childData, type: 'chat'});
    this.chatService.hideChat(this.childData);
  }

  timestampToHMS(timestamp: number): string {
    const date: Date = new Date(timestamp);
    let hour: string | number = date.getHours();
    let minute: string | number = date.getMinutes();
    hour = hour < 10 ? '0' + hour : hour;
    minute = minute < 10 ? '0' + minute : minute;
    return hour + ':' + minute;
  }

  sendMessage(): void {
    if (this.newMessage && this.newMessage.trim() !== '') {
      this.chatService.sendMessage(this.newMessage, this.childData.id !== 'public_chat' ? this.childData.id : undefined);
      this.newMessage = '';
    }
    // console.log('Message sent!');
  }
}
