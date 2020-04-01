import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MeetingPageComponent } from './pages/meeting-page/meeting-page.component';


const routes: Routes = [
  { path: 'j/:id', component: MeetingPageComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
