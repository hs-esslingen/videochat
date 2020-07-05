import {Component, OnInit, Input, HostListener, ViewChild, ElementRef} from '@angular/core';
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

  @ViewChild('input') input!: ElementRef<HTMLTextAreaElement>;

  handleKeyUp(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.shiftKey || event.shiftKey)) {
      this.sendMessage();
      event.preventDefault();
    }
  }

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    this.input.nativeElement.focus();
  }

  sendMessage(): void {
    if (this.newMessage && this.newMessage.trim() !== '') {
      this.chatService.sendMessage(this.newMessage, this.childData.id !== 'public_chat' ? this.childData.id : undefined);
      this.newMessage = '';
    }
    console.log('Message sent!');
  }
}
