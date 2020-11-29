import {Input} from '@angular/core';
import {Component, OnInit} from '@angular/core';
import {Answer, Question, QuestionType} from 'src/app/model/poll';

@Component({
  selector: 'app-poll-question-result',
  templateUrl: './poll-question-result.component.html',
  styleUrls: ['./poll-question-result.component.scss'],
})
export class PollQuestionResultComponent implements OnInit {
  @Input() question!: Question;
  results!: {[answer: string]: number};

  constructor() {}

  ngOnInit(): void {
    this.calculateOccurances();
    this.question.answers.forEach(answer => {
      const numberOfResonses = this.results[answer.id];
    });
  }

  calculateOccurances(): {[answer: string]: number} {
    if (this.question.results == null) return {};
    const results = this.question.results;
    return Object.values(results).reduce((obj, data) => {
      if (Array.isArray(data))
        data.forEach(item => {
          if (obj[item]) obj[item] = 0;
          obj[item]++;
        });
      else {
        if (obj[data]) obj[data] = 0;
        obj[data]++;
      }
      return obj;
    }, {} as {[id: string]: number});
  }
}
