import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { MeetingPageComponent } from "./pages/meeting-page/meeting-page.component";
import { ThankYouPageComponent } from './pages/thank-you-page/thank-you-page.component';
import { OverviewPageComponent } from './pages/overview-page/overview-page.component';

const routes: Routes = [
  { path: ":roomId", component: MeetingPageComponent },
  { path: ":roomId/thank-you", component: ThankYouPageComponent },
  { path: "**", component: OverviewPageComponent,  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      initialNavigation: "enabled"
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
