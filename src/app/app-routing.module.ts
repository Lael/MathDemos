import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {BilliardsDemoComponent} from "./demos/billiards-demo/billiards-demo.component";
import {HomePageComponent} from "./home-page/home-page.component";

const routes: Routes = [
  {path: "", component: HomePageComponent},
  {path: "hyperbolic-outer-billiards", component: BilliardsDemoComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
