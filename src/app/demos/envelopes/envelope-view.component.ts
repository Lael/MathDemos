import {Component, Input} from '@angular/core';
import {WindowPaneComponent} from "../../widgets/window-pane/window-pane.component";
import {Disk, DiskSpec} from "../../../graphics/shapes/disk";
import {Color} from "../../../graphics/shapes/color";
import {Complex} from "../../../math/complex";
import {lcm} from "../../../math/math-helpers";
import {Settings} from "./envelope.component";
import {MultiArc, MultiArcSpec} from "../../../graphics/shapes/multi-path";
import {OrthographicCamera} from "../../../graphics/camera/orthographic-camera";

@Component({
    selector: 'envelope-view',
    templateUrl: '../../widgets/window-pane/window-pane.component.html',
    styleUrls: ['../../widgets/window-pane/window-pane.component.sass']
})
export class EnvelopeViewComponent extends WindowPaneComponent {
    private dirty = true;

    settings: Settings = {
        resolution: 0,
        smallStep: 1,
        largeStep: 1,
        offset: 0,
    };

    @Input('settings')
    set setSettings(settings: Settings) {
        this.settings = settings;
        this.dirty = true;
    }

    override init() {
        this.camera = new OrthographicCamera();
        this.camera.setZoom(Math.sqrt(2) / 0.9);
        this.resizeCamera(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    override frame(dt: number) {
        super.frame(dt);
        if (this.dirty) {
            this.recomputeLines();
            this.dirty = false;
        }
    }

    recomputeLines() {
        this.scene.clear();
        this.scene.set('background', new Disk(this.gl, new DiskSpec(new Complex(), 1, Color.WHITE, Color.ONYX), 0.2));
        const start = performance.now();
        let smallHand = 0;
        let largeHand = this.settings.offset;
        const smallRounds = lcm(this.settings.smallStep, 360) / 360;
        const largeRounds = lcm(this.settings.largeStep, 360) / 360;
        const rounds = lcm(smallRounds, largeRounds);
        const degreesPerStep = Math.pow(2, this.settings.resolution);
        const chords: Complex[][] = [];
        for (let i = 0; i < 360 * rounds / degreesPerStep; i++) {
            const p1 = Complex.polar(1, Math.PI / 2 - smallHand / 180 * Math.PI);
            const p2 = Complex.polar(1, Math.PI / 2 - largeHand / 180 * Math.PI);
            chords.push([p1, p2]);
            smallHand += this.settings.smallStep * degreesPerStep;
            largeHand += this.settings.largeStep * degreesPerStep;
        }
        this.scene.set(`chords`, new MultiArc(this.gl, new MultiArcSpec(chords, Color.GREY), 0.1));
        // const time = Math.round(1000 * (performance.now() - start)) / 1000;
    }
}
