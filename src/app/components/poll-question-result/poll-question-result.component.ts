import {Input, OnDestroy, Component, OnInit} from '@angular/core';
import {Subscription} from 'rxjs';
import {PollService} from 'src/app/helper/poll.service';
import {Question, QuestionType} from 'src/app/model/poll';
import {CurrentUser, User} from 'src/app/model/user';

@Component({
  selector: 'app-poll-question-result',
  templateUrl: './poll-question-result.component.html',
  styleUrls: ['./poll-question-result.component.scss'],
})
export class PollQuestionResultComponent implements OnInit, OnDestroy {
  @Input() question!: Question;
  @Input() users: {[id: string]: User} = {};
  @Input() currentUser!: CurrentUser;
  pollSubscription?: Subscription;

  results!: {[answer: string]: string[]};
  totalResponses = 0;
  constructor(private pollService: PollService) {}

  ngOnInit(): void {
    this.pollSubscription = this.pollService.subscribe(() => {
      setTimeout(() => {
        if (this.question.results != null) this.totalResponses = Object.keys(this.question.results).length;
        this.results = this.calculateOccurances();
      }, 100);
    });
    if (this.question.type !== QuestionType.FREE_TEXT) {
      this.results = this.calculateOccurances();
      if (this.question.results != null) this.totalResponses = Object.keys(this.question.results).length;
    }
  }
  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  calculateOccurances(): {[answer: string]: string[]} {
    if (this.question.results == null) return {};
    const results = this.question.results;
    return Object.keys(results).reduce((obj, uid) => {
      const result = results[uid];
      if (Array.isArray(result))
        result.forEach(item => {
          if (!obj[item]) obj[item] = [];
          obj[item].push(uid);
        });
      else {
        if (!obj[result]) obj[result] = [];
        obj[result].push(uid);
      }
      return obj;
    }, {} as {[id: string]: string[]});
  }

  trackById(index: number, item: {id: string}): string {
    return item.id;
  }
}
