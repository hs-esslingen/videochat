import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {ThankYouPageComponent} from './pages/thank-you-page/thank-you-page.component';
import {OverviewPageComponent} from './pages/overview-page/overview-page.component';
import {PrivacyPolicyComponent} from './pages/privacy-policy/privacy-policy.component';
import {AuthGuard} from './helper/auth.guard';
import {LoginPageComponent} from './pages/login-page/login-page.component';
import {ContactsPageComponent} from './pages/contacts-page/contacts-page.component';
import {ImprintPageComponent} from './pages/imprint-page/imprint-page.component';
import {LecturePageComponent} from './pages/lecture-page/lecture-page.component';
import {MoodleGuard} from './helper/moodle.guard';

const routes: Routes = [
  {path: 'datenschutz', component: PrivacyPolicyComponent},
  {path: 'kontakt', component: ContactsPageComponent},
  {path: 'impressum', component: ImprintPageComponent},
  {path: 'login', component: LoginPageComponent},
  // TODO: Create lecture Overiview Page
  // { path: "lecture", component: LecturePageComponent, canActivate: [AuthGuard]  },
  {path: ':roomId', component: LecturePageComponent, canActivate: [AuthGuard]},
  {path: ':roomId/thank-you', component: ThankYouPageComponent, canActivate: [AuthGuard]},
  {path: 'moodle/:roomId', component: LecturePageComponent, canActivate: [AuthGuard], resolve: {moodle: MoodleGuard}},
  {path: '**', component: OverviewPageComponent, canActivate: [AuthGuard]},
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      initialNavigation: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
