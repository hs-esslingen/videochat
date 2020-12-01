import {EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges} from '@angular/core';
import {Component, OnInit} from '@angular/core';
import {FormGroup} from '@angular/forms';
import {Subscription} from 'rxjs';
import {PollService} from 'src/app/helper/poll.service';
import {RoomService} from 'src/app/helper/room.service';
import {Poll, QuestionType} from 'src/app/model/poll';
import {CurrentUser, User, UserRole} from 'src/app/model/user';

@Component({
  selector: 'app-poll',
  templateUrl: './poll.component.html',
  styleUrls: ['./poll.component.scss'],
})
export class PollComponent implements OnInit, OnChanges, OnDestroy {
  @Input() childData!: string;
  @Input() currentUser!: CurrentUser;
  @Input() users: {[id: string]: User} = {};
  showResults = false;
  questionsTypes!: string[];
  poll!: Poll;
  form?: FormGroup;
  waitigForResponse: string[] = [];
  oldNumberOfUsers = 0;

  pollSubscription?: Subscription;
  roomSubscription?: Subscription;

  @Output() closePollEvent = new EventEmitter<{element: string; type: 'poll'}>();

  constructor(private pollService: PollService, private roomService: RoomService) {}

  ngOnInit(): void {
    this.pollSubscription = this.pollService.subscribe(() => {
      if (this.poll.state === 1 && !this.form) {
        this.form = this.pollService.getForm(this.childData);
      }
      if (this.poll.state >= 1 && this.currentUser.role === UserRole.MODERATOR) {
        this.showResults = true;
      }

      this.calculateWaitigForResponse(true);
    });
    this.roomSubscription = this.roomService.subscribe(() => {
      this.calculateWaitigForResponse();
    });

    this.poll = this.pollService.getPoll(this.childData);
    if (this.poll.state === 1) {
      this.form = this.pollService.getForm(this.childData);
      if (this.poll.responded) this.form.disable();
    }
    this.questionsTypes = Object.values(QuestionType);
  }

  calculateWaitigForResponse(force = false) {
    const userArray = Object.values(this.users);
    if (this.poll.state >= 1 && this.currentUser.role === UserRole.MODERATOR && (userArray.length !== this.oldNumberOfUsers || force)) {
      this.oldNumberOfUsers = userArray.length;
      this.waitigForResponse = userArray.filter(user => !this.poll.responders.includes(user.id) && user.userRole === UserRole.USER).map(user => user.nickname);
    }
  }

  ngOnDestroy(): void {
    console.log('unsubscribe');
    this.roomSubscription?.unsubscribe();
    this.pollSubscription?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.childData) {
      this.poll = this.pollService.getPoll(this.childData);
      this.form = undefined;
      if (this.poll.state === 1) {
        this.form = this.pollService.getForm(this.childData);
      }
      if (this.poll.state >= 1 && this.currentUser.role === UserRole.MODERATOR) {
        this.showResults = true;
      } else {
        this.showResults = false;
      }
    }
  }

  trackById(index: number, item: {id: string}): string {
    return item.id;
  }

  addElement() {
    this.pollService.addElement(this.poll.id);
  }

  async publishPoll() {
    if (this.pollService.beforePublishPoll(this.poll)) await this.pollService.publishPoll(this.poll);
  }

  async submitPoll() {
    if (this.form?.valid) {
      this.pollService.submitPoll(this.poll.id, this.form.value);
    }
  }
}
