import {Component, Input} from '@angular/core';
import {WindowPaneComponent} from "../../widgets/window-pane/window-pane.component";
import {DEFAULT_SETTINGS, Settings} from "./mobius.component";
import {Complex} from "../../../math/complex";
import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../../../math/hyperbolic/hyperbolic";
import {MultiArc} from "../../../graphics/shapes/multi-path";
import {Disk, DiskSpec} from "../../../graphics/shapes/disk";
import {Color} from "../../../graphics/shapes/color";
import {Mobius} from "../../../math/mobius";

@Component({
    selector: 'mobius-view',
    templateUrl: '../../widgets/window-pane/window-pane.component.html',
    styleUrls: ['../../widgets/window-pane/window-pane.component.sass']
})
export class MobiusViewComponent extends WindowPaneComponent {
    private dirty = true;
    private geodesicsLR: HyperGeodesic[] = [];
    private geodesicsUD: HyperGeodesic[] = [];
    private point: Complex = new Complex();
    private theta: number = 0;
    private mobius: Mobius = Mobius.blaschke(new Complex());

    settings: Settings = DEFAULT_SETTINGS;

    @Input('settings')
    set setSettings(settings: Settings) {
        this.settings = settings;
        this.dirty = true;
    }

    override init() {
        super.init();
        const dtheta = Math.PI / (2 * this.settings.resolution);
        for (let i = 1; i < 2 * this.settings.resolution; i++) {
            const theta = i * dtheta;
            const p1 = new HyperPoint(Complex.polar(1, theta), HyperbolicModel.POINCARE);
            const p2 = new HyperPoint(Complex.polar(1, -theta), HyperbolicModel.POINCARE);
            const p3 = new HyperPoint(Complex.polar(1, Math.PI / 2 + theta), HyperbolicModel.POINCARE);
            const p4 = new HyperPoint(Complex.polar(1, Math.PI / 2 - theta), HyperbolicModel.POINCARE);
            this.geodesicsLR.push(new HyperGeodesic(p1, p2));
            this.geodesicsUD.push(new HyperGeodesic(p3, p4));
        }
    }

    override frame(dt: number) {
        super.frame(dt);
        if (!this.dirty) return;

        const imageGeodesicsLR = this.geodesicsLR.map(g => {
            const p1i = this.mobius.apply(g.p1.resolve(HyperbolicModel.POINCARE));
            const p2i = this.mobius.apply(g.p2.resolve(HyperbolicModel.POINCARE));
            return new HyperGeodesic(new HyperPoint(p1i, HyperbolicModel.POINCARE),
                new HyperPoint(p2i, HyperbolicModel.POINCARE));
        });
        const imageGeodesicsUD = this.geodesicsUD.map(g => {
            const p1i = this.mobius.apply(g.p1.resolve(HyperbolicModel.POINCARE));
            const p2i = this.mobius.apply(g.p2.resolve(HyperbolicModel.POINCARE));
            return new HyperGeodesic(new HyperPoint(p1i, HyperbolicModel.POINCARE),
                new HyperPoint(p2i, HyperbolicModel.POINCARE));
        });

        this.scene.clear();
        this.scene.set('disk', new Disk(this.gl,
            new DiskSpec(new Complex(), 1, Color.scheme.primary, Color.scheme.border, 0.01), 0.5));
        this.scene.set('gridLR',
            MultiArc.fromSegmentList(this.gl,
                this.geodesicsLR.map(g => g.segment(this.settings.model)),
                Color.MAGENTA,
                Color.ZERO,
                0,
                0.2));
        this.scene.set('gridUD',
            MultiArc.fromSegmentList(this.gl,
                this.geodesicsUD.map(g => g.segment(this.settings.model)),
                Color.TURQUOISE,
                Color.ZERO,
                0,
                0.2));
        this.scene.set('gridImageLR',
            MultiArc.fromSegmentList(this.gl,
                imageGeodesicsLR.map(g => g.segment(this.settings.model)),
                Color.RED,
                Color.ZERO,
                0.005)
        );
        this.scene.set('gridImageUD',
            MultiArc.fromSegmentList(this.gl, imageGeodesicsUD.map(g => g.segment(this.settings.model)),
                Color.BLUE,
                Color.ZERO,
                0.005)
        );
        this.scene.set('point',
            new Disk(this.gl,
                new DiskSpec(this.point, 0.01, Color.GREEN, undefined, 0.01)));
        this.scene.set('zero',
            new Disk(this.gl,
                new DiskSpec(this.mobius.apply(new Complex()), 0.005, Color.scheme.secondary, undefined, 0.01)));
        this.scene.set('one',
            new Disk(this.gl,
                new DiskSpec(this.mobius.apply(new Complex(1, 0)), 0.005, Color.scheme.secondary, undefined, 0.01)));
        const fp = this.mobius.fixedPoints().find(p => p.modulusSquared() <= 1.000001);
        if (fp !== undefined) {
            this.scene.set('fp',
                new Disk(this.gl,
                    new DiskSpec(fp, 0.005, Color.scheme.tertiary, undefined, 0.01)));
        }
    }

    override keyDown(e: KeyboardEvent) {
        super.keyDown(e);
        if (e.key === 'ArrowLeft') this.point = this.point.plus(new Complex(+0.01, 0));
        if (e.key === 'ArrowRight') this.point = this.point.plus(new Complex(-0.01, 0));
        if (e.key === 'ArrowUp') this.point = this.point.plus(new Complex(0, -0.01));
        if (e.key === 'ArrowDown') this.point = this.point.plus(new Complex(0, +0.01));
        if (e.key === 'i') this.theta += Math.PI / 120;
        if (e.key === 'k') this.theta -= Math.PI / 120;
        // this.mobius = Mobius.rotateAroundPoint(this.point, this.theta);
        this.mobius = Mobius.pointInversion(this.point);
        this.dirty = true;
    }
}
