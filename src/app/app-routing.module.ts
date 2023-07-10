import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {HomePageComponent} from "./home-page/home-page.component";
import {BILLIARDS_PATH, ENVELOPES_PATH, SYMPLECTIC_PATH, TILING_PATH, UNFOLDING_PATH,} from "./paths";
import {EnvelopeComponent} from "./demos/envelopes/envelope.component";
import {NewBilliardsComponent} from "./demos/new-billiards/new-billiards.component";
import {TilingComponent} from "./demos/tiling/tiling.component";
import {SymplecticComponent} from "./demos/symplectic/symplectic.component";
import {BilliardsUnfoldingComponent} from "./demos/unfolding/billiards-unfolding.component";
import {Unfolding3DComponent} from "./demos/unfolding-3d/unfolding-3d.component";
import {TileBilliardsComponent} from "./demos/tile-billiards/tile-billiards.component";

const routes: Routes = [
    {path: '', component: HomePageComponent},
    // {path: SURFACES_PATH, component: SurfacesDemoComponent},
    // {path: FUNCTIONS_PATH, component: FunctionsDemoComponent},
    {path: BILLIARDS_PATH, component: NewBilliardsComponent},
    {path: ENVELOPES_PATH, component: EnvelopeComponent},
    // {path: PENTAGRAM_PATH, component: PentagramComponent},
    // {path: MOBIUS_PATH, component: MobiusComponent},
    {path: TILING_PATH, component: TilingComponent},
    // {path: POINCARE_PATH, component: PoincareComponent},
    {path: SYMPLECTIC_PATH, component: SymplecticComponent},
    {path: UNFOLDING_PATH, component: BilliardsUnfoldingComponent},
    {path: 'unfolding-3d', component: Unfolding3DComponent},
    {path: 'tile-billiards', component: TileBilliardsComponent},
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true})],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
