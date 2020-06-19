import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PollService {
  constructor() {}
}

//Currently just a dummy
export class Poll {
  constructor(
    public id: string,
    public title: string
  ) {}
}
