import {EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {PollService} from 'src/app/helper/poll.service';
import {Poll, QuestionType} from 'src/app/model/poll';
import {CurrentUser} from 'src/app/model/user';

@Component({
  selector: 'app-poll',
  templateUrl: './poll.component.html',
  styleUrls: ['./poll.component.scss'],
})
export class PollComponent implements OnInit, OnChanges {
  @Input() childData!: string;
  @Input() currentUser?: CurrentUser;
  questionsTypes!: string[];
  poll!: Poll;
  form?: FormGroup;

  @Output() closePollEvent = new EventEmitter<{element: string; type: 'poll'}>();

  constructor(private pollService: PollService) {
    pollService.subscribe(() => {
      if (this.poll.state === 1 && !this.form) {
        this.form = pollService.getForm(this.childData);
      }
    });
  }

  ngOnInit(): void {
    this.poll = this.pollService.getPoll(this.childData);
    if (this.poll.state === 1) {
      this.form = this.pollService.getForm(this.childData);
    }
    this.questionsTypes = Object.values(QuestionType);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.childData) {
      this.poll = this.pollService.getPoll(this.childData);
      this.form = undefined;
      if (this.poll.state === 1) {
        this.form = this.pollService.getForm(this.childData);
      }
    }
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
