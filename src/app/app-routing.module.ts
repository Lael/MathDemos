import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SurfacesDemoComponent} from "./demos/surfaces/surfaces-demo.component";
import {HomePageComponent} from "./home-page/home-page.component";
import {FunctionsDemoComponent} from "./demos/functions/functions-demo/functions-demo.component";
import {BILLIARDS_PATH, ENVELOPES_PATH, FUNCTIONS_PATH, MOBIUS_PATH, PENTAGRAM_PATH, SURFACES_PATH} from "./paths";
import {EnvelopeComponent} from "./demos/envelopes/envelope.component";
import {PentagramComponent} from "./demos/pentagram/pentagram.component";
import {MobiusComponent} from "./demos/mobius/mobius.component";
import {NewBilliardsComponent} from "./demos/new-billiards/new-billiards.component";

const routes: Routes = [
    {path: '', component: HomePageComponent},
    {path: SURFACES_PATH, component: SurfacesDemoComponent},
    {path: FUNCTIONS_PATH, component: FunctionsDemoComponent},
    {path: BILLIARDS_PATH, component: NewBilliardsComponent},
    {path: ENVELOPES_PATH, component: EnvelopeComponent},
    {path: PENTAGRAM_PATH, component: PentagramComponent},
    {path: MOBIUS_PATH, component: MobiusComponent},
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true})],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
