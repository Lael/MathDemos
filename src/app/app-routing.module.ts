import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {BilliardsDemoComponent} from "./demos/hyperbolic-outer-billiards/billiards-demo.component";

const routes: Routes = [
  {path: "", component: BilliardsDemoComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
