import {Component, EventEmitter, Input, Output} from '@angular/core';
import {WindowPaneComponent} from "../../widgets/window-pane/window-pane.component";
import {
  HyperbolicOuterBilliards, HyperbolicOuterBilliardsResults,
  HyperbolicOuterBilliardsSettings,
} from "../../../../math/hyperbolic/hyperbolic-outer-billiards";
import {Disk, DiskSpec} from "../../../../graphics/shapes/disk";
import {Color} from "../../../../graphics/shapes/color";
import {OrthographicCamera} from "../../../../graphics/camera/orthographic-camera";
import {Complex} from "../../../../math/complex";

@Component({
  selector: 'billiards-view',
  templateUrl: '../../widgets/window-pane/window-pane.component.html',
  styleUrls: ['../../widgets/window-pane/window-pane.component.sass']
})
export class BilliardsViewComponent extends WindowPaneComponent {
  private initialized = false;
  private point: Complex|null = null;
  private pointMoved = false;

  _settings = new HyperbolicOuterBilliardsSettings();
  @Input('settings')
  set settings(newSettings: HyperbolicOuterBilliardsSettings) {
    this._settings = newSettings;
    if (this.initialized) this.setSelectables();
  }

  @Output('results')
  resultsEvent = new EventEmitter<HyperbolicOuterBilliardsResults>();

  hob!: HyperbolicOuterBilliards;

  override init() {
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.camera = new OrthographicCamera();
    this.camera.setZoom(Math.sqrt(2) / 0.9);
    this.hob = new HyperbolicOuterBilliards(this.gl, new HyperbolicOuterBilliardsResults());

    this.hob.setSettings(this._settings);
    this.hob.populateScene(this.scene, this.point);
    this.setSelectables();
    this.initialized = true;
  }

  setSelectables() {
    const ths = this;
    for (let i = 0; i < this.hob.vertices.length; i++) {
      const s = {
        ...WindowPaneComponent.getSelectable(i + 1),
        drawable: new Disk(this.gl,
            new DiskSpec(this.hob.vertices[i].resolve(ths._settings.model), 0.05, Color.RED, undefined)),
        mouseMove(x: number, y: number) {
          const p = ths.viewportToWorld(x, y);
          this.drawable?.recenter(p.x, p.y, 0);
          ths.hob.moveVertex(i, new Complex(p.x, p.y));
          ths.hob.setSettings(ths._settings);
          ths.hob.populateScene(ths.scene, ths.point);
        }
      }
      this.addSelectable(`vertex_handle_${i + 1}`, s);
    }
  }

  override frame(dt: number) {
    try {
      if (this._settings.dirty) {
        this.hob.setSettings(this._settings);
        this.hob.equilateral();
        // this.hob.triangleFromAngles(this._settings);
      }
      this.hob.setSettings(this._settings);
      this.hob.populateScene(this.scene, this.point);
    } catch (e) {}

    this._settings.dirty = false;
  }

  override draw() {
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.viewShader.bind();

    const color = Color.ONYX;
    this.gl.clearColor(color.r, color.g, color.b, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

    this.scene.draw(this.viewShader, this.camera);
  }

  override mouseDown(x: number, y: number) {
    super.mouseDown(x, y);
    if (this.selectedID !== 0) return;
    const w = this.viewportToWorld(x, y);
    const p = new Complex(w.x, w.y);
    if (p.modulusSquared() >= 1) this.point = null;
    else {
      this.point = p;
      this.pointMoved = true;
    }
  }
}
