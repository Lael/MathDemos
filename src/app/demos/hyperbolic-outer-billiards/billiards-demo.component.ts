import {Component, AfterViewInit, ViewChild} from '@angular/core';
import {
  HyperbolicOuterBilliardsSettings,
} from '../../../math/hyperbolic/hyperbolic-outer-billiards';
import {BilliardsViewComponent} from "./billiards-view/billiards-view.component";
import {HobSettingsComponent} from "./hob-settings/hob-settings.component";

@Component({
  selector: 'app-hyperbolic-outer-billiards',
  templateUrl: './billiards-demo.component.html',
  styleUrls: ['./billiards-demo.component.sass']
})
export class BilliardsDemoComponent implements AfterViewInit {
  settings = new HyperbolicOuterBilliardsSettings();
  // results = new HyperbolicOuterBilliardsResults();

  @ViewChild(HobSettingsComponent)
  settingsComponent!: HobSettingsComponent;

  // @ViewChild(PointPickerComponent)
  // pickerComponent!: PointPickerComponent;

  @ViewChild(BilliardsViewComponent)
  billiardsViewComponent!: BilliardsViewComponent;

  constructor() {}

  ngAfterViewInit(): void {
    this.init();
  }

  protected init(): void {
    this.settingsComponent.settingsEmitter.subscribe(newSettings => this.settings = newSettings);
    // this.pickerComponent.pointEvent.subscribe(p => {
    //   this.settings.angleA = p.x;
    //   this.settings.angleB = p.y;
    //   this.settings.angleC = p.z;
    //   this.updateSettings();
    // });
  }

  // protected frame(dt: number): void {
  //   this.billiardsViewComponent.frame(dt);
  //   this.pickerComponent.frame(dt);
  // }

  updateSettings() {
    // this.hob?.redraw();
    // this.selectables.clear();
    // for (let i = 0; i < this.hob.vertices.length; i++) {
    //   this.addSelectable(`vertex_handle_${i + 1}`, new VertexHandle(this.gl, i, this.hob, this.scene, this.viewportToWorld.bind(this)));
    // }
    // this.settings = {
    //   ...this.settings,
    //   dirty: true,
    // };
  }

  triangleFromAngles() {
    // this.hob?.triangleFromAngles();
    this.updateSettings();
  }

  // orbitText() {
  //   return this.results.orbit ? 'Yes' : 'No';
  // }
  //
  // orbitLengthText() {
  //   return this.results.orbit ? `${this.results.orbitLength}` : '';
  // }
  //
  // orbitAngleText() {
  //   const a = Math.round(this.results.orbitMapRotation * 10000 / Math.PI) / 10000;
  //   return this.results.orbit ? `${a}π` : '';
  // }
}
