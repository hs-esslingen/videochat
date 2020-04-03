import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/helper/api.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor(readonly api: ApiService) {
  }

  ngOnInit(): void {
  }
}
