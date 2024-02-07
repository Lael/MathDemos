import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {HomePageComponent} from "./home-page/home-page.component";
import {BILLIARDS_PATH, ENVELOPES_PATH, SYMPLECTIC_PATH, TILING_PATH, UNFOLDING_PATH,} from "./paths";
import {EnvelopeComponent} from "./demos/envelopes/envelope.component";
import {BilliardsComponent} from "./demos/billiards/billiards.component";
import {TilingComponent} from "./demos/tiling/tiling.component";
import {SymplecticComponent} from "./demos/symplectic/symplectic.component";
import {BilliardsUnfoldingComponent} from "./demos/unfolding/billiards-unfolding.component";
import {Unfolding3DComponent} from "./demos/unfolding-3d/unfolding-3d.component";
import {TileBilliardsComponent} from "./demos/tile-billiards/tile-billiards.component";
import {CorridorsComponent} from "./demos/corridors/corridors.component";
import {ScalingBilliardsComponent} from "./demos/scaling-billiards/scaling-billiards.component";
import {HyperbolicGeometryComponent} from "./demos/hyperbolic-geometry/hyperbolic-geometry.component";
import {TicktockComponent} from "./demos/ticktock/ticktock.component";
import {TriangleMapComponent} from "./demos/triangle-map/triangle-map.component";
import {SymmetricComponent} from "./demos/symmetry/symmetric.component";

export const routes: Routes = [
    {path: '', component: HomePageComponent},
    // {path: SURFACES_PATH, component: SurfacesDemoComponent},
    // {path: FUNCTIONS_PATH, component: FunctionsDemoComponent},
    {path: BILLIARDS_PATH, component: BilliardsComponent},
    {path: ENVELOPES_PATH, component: EnvelopeComponent},
    // {path: PENTAGRAM_PATH, component: PentagramComponent},
    // {path: MOBIUS_PATH, component: MobiusComponent},
    {path: TILING_PATH, component: TilingComponent},
    // {path: POINCARE_PATH, component: PoincareComponent},
    {path: SYMPLECTIC_PATH, component: SymplecticComponent},
    {path: UNFOLDING_PATH, component: BilliardsUnfoldingComponent},
    {path: 'unfolding-3d', component: Unfolding3DComponent},
    {path: 'tile-billiards', component: TileBilliardsComponent},
    {path: 'corridors', component: CorridorsComponent},
    {path: 'scaling', component: ScalingBilliardsComponent},
    {path: 'hyperbolic', component: HyperbolicGeometryComponent},
    {path: 'ticktock', component: TicktockComponent},
    {path: 'triangle-map', component: TriangleMapComponent},
    {path: 'symmetric', component: SymmetricComponent},
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {useHash: true})],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
