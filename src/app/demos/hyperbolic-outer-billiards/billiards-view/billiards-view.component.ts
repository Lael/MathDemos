import {Component, EventEmitter, Input} from '@angular/core';
import {WindowPaneComponent} from "../../../widgets/window-pane/window-pane.component";
import {
    HOBResults,
    HOBSettings,
    HyperbolicOuterBilliards,
} from "../../../../math/hyperbolic/hyperbolic-outer-billiards";
import {Disk, DiskSpec} from "../../../../graphics/shapes/disk";
import {Color} from "../../../../graphics/shapes/color";
import {OrthographicCamera} from "../../../../graphics/camera/orthographic-camera";
import {Complex} from "../../../../math/complex";

@Component({
    selector: 'billiards-view',
    templateUrl: '../../../widgets/window-pane/window-pane.component.html',
    styleUrls: ['../../../widgets/window-pane/window-pane.component.sass']
})
export class BilliardsViewComponent extends WindowPaneComponent {
    private initialized = false;
    private point: Complex | null = null;
    private pointMoved = false;

    _settings = new HOBSettings();
    @Input('settings')
    set settings(newSettings: HOBSettings) {
        this._settings = newSettings;
        // if (this.initialized) this.setSelectables();
    }

    // @Output('results')
    resultsEvent = new EventEmitter<HOBResults>();

    hob!: HyperbolicOuterBilliards;

    override init() {
        this.camera = new OrthographicCamera();
        this.camera.setZoom(Math.sqrt(2) / 0.9);
        this.resizeCamera(this.canvas.clientWidth, this.canvas.clientHeight);
        this.hob = new HyperbolicOuterBilliards(this.gl, new HOBResults());

        this.hob.setSettings(this._settings);
        this.hob.populateScene(this.scene, this.point);
        // this.setSelectables();
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
        } catch (e) {
        }

        this._settings.dirty = false;
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
