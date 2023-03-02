import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {HOBSettings} from "../../../../math/hyperbolic/hyperbolic-outer-billiards";
import {HyperbolicModel, HyperPoint} from "../../../../math/hyperbolic/hyperbolic";

@Component({
  selector: 'hob-settings',
  templateUrl: './hob-settings.component.html',
  styleUrls: ['./hob-settings.component.sass']
})
export class HobSettingsComponent implements OnInit {
  model = HyperbolicModel;

  settings = new HOBSettings();

  @Output('settings')
  settingsEmitter = new EventEmitter<HOBSettings>();

  constructor() { }

  ngOnInit(): void {
  }

  preciseSize() {
    this.settings.equilateralRadius = this.settings.equilateralRadius || 0.2;
    this.updateSettings();
  }

  setAngle(event: Event) {
    const v = (event.target as HTMLInputElement).value;
    const parts = v.split('/');
    if (parts.length === 1) {
      const theta = Number.parseFloat(parts[0]) * Math.PI;
      const r = radiusForAngle(theta, this.settings.vertexCount);
      if (isNaN(r)) return;
      this.settings.equilateralRadius = r;
      this.updateSettings();
    } else if (parts.length === 2) {
      const theta = Number.parseFloat(parts[0]) / Number.parseFloat(parts[1]) * Math.PI;
      const r = radiusForAngle(theta, this.settings.vertexCount);
      if (isNaN(r)) return;
      this.settings.equilateralRadius = r;
      this.updateSettings();
    }
  }

  updateSettings() {
    // angleForRadius(this.settings.equilateralRadius, this.settings.vertexCount);
    this.settingsEmitter.emit({
      ...this.settings,
      dirty: true,
    });
  }
}

// function angleForRadius(trueRadius: number, n: number): number {
//   const k = HyperPoint.trueToKlein(trueRadius);
//   const ko = k / Math.cos(Math.PI / n);
//   const po = HyperPoint.kleinToPoincare(ko);
//   console.log('Orbit Poincare', po);
//   const a = 2 * n * Math.atan((1 - po * po) / (1 + po * po) / Math.tan(Math.PI / n));
//   console.log(a);
//   return a;
// }

function radiusForAngle(theta: number, n: number): number {
  const t = Math.tan(Math.PI / n) * Math.tan(theta / (2 * n));
  // Radius at periodic point
  const po = Math.sqrt((1 - t) / (1 + t));

  const ko = HyperPoint.poincareToKlein(po);
  const k = ko * Math.cos(Math.PI / n);
  return HyperPoint.kleinToTrue(k);
}
