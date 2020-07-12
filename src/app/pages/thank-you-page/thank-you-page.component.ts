import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';

@Component({
  selector: 'app-thank-you-page',
  templateUrl: './thank-you-page.component.html',
  styleUrls: ['./thank-you-page.component.scss'],
})
export class ThankYouPageComponent implements OnInit {
  roomId!: string;

  constructor(private route: ActivatedRoute, private router: Router, private location: Location) {}

  ngOnInit(): void {}

  backtoroom() {
    this.location.back();
  }
}
