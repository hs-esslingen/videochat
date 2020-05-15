import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-thank-you-page',
  templateUrl: './thank-you-page.component.html',
  styleUrls: ['./thank-you-page.component.scss'],
})
export class ThankYouPageComponent implements OnInit {
  roomId!: string;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {}

  backtoroom() {
    this.route.paramMap.subscribe(async params => {
      this.roomId = params.get('roomId') as string;
      this.router.navigate([this.roomId], {replaceUrl: true});
    });
  }
}
