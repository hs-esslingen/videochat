import {Component, Input, OnInit} from '@angular/core';
import {FormGroup} from '@angular/forms';
import {PollService} from 'src/app/helper/poll.service';
import {Question, QuestionType} from 'src/app/model/poll';

@Component({
  selector: 'app-poll-question',
  templateUrl: './poll-question.component.html',
  styleUrls: ['./poll-question.component.scss'],
})
export class PollQuestionComponent implements OnInit {
  @Input() question!: Question;
  @Input() pollId!: string;
  @Input() editMode = false;
  @Input() form?: FormGroup;
  newElement = '';
  colums: object[] = [];

  constructor(private pollService: PollService) {}

  ngOnInit(): void {
    this.colums = new Array(this.question.answers.length + 1);
  }

  changeType(type: QuestionType) {
    if (type === QuestionType.FREE_TEXT) {
      this.question.answers = [];
      this.colums = [];
    } else if (this.colums.length === 0) {
      this.colums = new Array(1);
    }
  }

  deleteElement() {
    this.pollService.deleteElement(this.pollId, this.question.id);
  }

  updateAnswersLength() {
    this.colums = new Array(this.question.answers.length + 1);
  }

  addAnswer(index: number, evt?: KeyboardEvent) {
    if (index === this.question.answers.length) {
      console.log(evt);
      this.question.answers.push({text: this.newElement, id: Math.random().toString(36).substr(2, 8)});
      this.newElement = '';
      this.updateAnswersLength();
    }
  }
  changeEvent(value: string, index: number) {
    this.question.answers[index].text = value;
  }

  deleteAnswer(index: number) {
    this.question.answers.splice(index, 1);
    this.updateAnswersLength();
  }
}
