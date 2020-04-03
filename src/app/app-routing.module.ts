import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { MeetingPageComponent } from "./pages/meeting-page/meeting-page.component";

const routes: Routes = [
  { path: "chat", component: MeetingPageComponent },
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
