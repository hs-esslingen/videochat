import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { MeetingPageComponent } from "./pages/meeting-page/meeting-page.component";
import { ThankYouPageComponent } from './pages/thank-you-page/thank-you-page.component';

const routes: Routes = [
  { path: "chat/:roomId", component: MeetingPageComponent },
  { path: "chat", component: MeetingPageComponent },
  { path: "thank-you", component: ThankYouPageComponent },
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
