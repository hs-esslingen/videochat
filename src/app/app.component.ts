import { Component } from '@angular/core';
import { ApiService } from 'src/app/helper/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'videochat';

  constructor(readonly api: ApiService) {

  }
}
