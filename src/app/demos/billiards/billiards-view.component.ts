import {Component, Input} from '@angular/core';
import {WindowPaneComponent} from "../../widgets/window-pane/window-pane.component";
import {OrthographicCamera} from "../../../graphics/camera/orthographic-camera";
import {Complex} from "../../../math/complex";
import {
    Billiard,
    BilliardsSettings,
    createBilliard,
    DEFAULT_BILLIARDS_SETTINGS,
    Duality,
    InnerBilliardState,
    OuterBilliardState,
    PhaseMode,
    Plane
} from "../../../math/billiards/billiards";
import {Color} from "../../../graphics/shapes/color";
import {Scene} from "../../../graphics/scene";
import {Camera} from "../../../graphics/camera/camera";
import {Vector3, Vector4} from "three";
import {normalizeAngle} from "../../../math/math-helpers";
import {AffinePoint} from "../../../math/geometry/geometry";
import {HyperPoint} from "../../../math/hyperbolic/hyperbolic";

@Component({
    selector: 'new-billiards-view',
    templateUrl: '../../widgets/window-pane/window-pane.component.html',
    styleUrls: ['../../widgets/window-pane/window-pane.component.sass']
})
export class BilliardsViewComponent extends WindowPaneComponent {
    private initialized = false;
    private settings: BilliardsSettings = DEFAULT_BILLIARDS_SETTINGS;
    private dirty = true;
    private billiard!: Billiard<any, any>;
    private phaseScene: Scene = new Scene();
    private phaseCamera: Camera = new OrthographicCamera();
    private phaseX = 0.25;
    private phaseY = 0.5;
    private outerX = 1;
    private outerY = 0;
    private noMove = true;

    @Input('settings')
    set updateSettings(settings: BilliardsSettings) {
        this.dirty = true;
        this.settings = settings;
        this.updateDuality();
    }

    private updateDuality() {
        if (!this.initialized) return;
        if (this.settings.duality === Duality.OUTER) {
            this.camera.setZoom(10);
            this.camera.setAspectRatio(this.gl.canvas.clientWidth / this.gl.canvas.clientHeight);
        } else {
            this.camera.setZoom(2);
            this.camera.setAspectRatio(this.gl.canvas.clientWidth / (2 * this.gl.canvas.clientHeight));
        }
    }

    override init() {
        this.camera = new OrthographicCamera();
        this.resizeCamera(this.canvas.clientWidth, this.canvas.clientHeight);
        this.updateDuality();
        this.resizeCamera(this.canvas.clientWidth, this.canvas.clientHeight, this.phaseCamera);
        this.phaseCamera.setZoom(this.phaseCamera.getZoom() * 1.25);
        this.billiard = createBilliard(this.settings, this.gl);
        this.billiard.populateScene(this.scene);
        if (this.settings.duality === Duality.INNER) this.decorateInner();
        if (this.settings.duality === Duality.OUTER) this.decorateOuter();
        window.onscroll = () => {
            window.scrollTo(0, 0);
        };
        this.initialized = true;
        this.updateDuality();
    }

    override frame(dt: number) {
        if (this.dirty) {
            this.billiard = createBilliard(this.settings, this.gl);
            this.scene.clear();
            this.billiard.populateScene(this.scene);
            if (this.settings.duality === Duality.INNER) this.decorateInner();
            if (this.settings.duality === Duality.OUTER) this.decorateOuter();
            this.dirty = false;
        }
    }

    override draw() {
        if (this.settings.duality === Duality.OUTER) {
            this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
            this.gl.disable(this.gl.SCISSOR_TEST);
            super.draw();
            return;
        }

        this.gl.enable(this.gl.SCISSOR_TEST);

        // Draw billiards scene on the left
        this.gl.viewport(0, 0, this.gl.canvas.width / 2, this.gl.canvas.height);
        this.gl.scissor(0, 0, this.gl.canvas.width / 2, this.gl.canvas.height);
        const color = Color.billiardsScheme.background;
        this.gl.clearColor(color.r, color.g, color.b, color.a);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.scene.draw(this.viewShader, this.camera);

        // Draw phase scene on the right
        this.phaseCamera.setAspectRatio(this.gl.canvas.clientWidth / (2 * this.gl.canvas.clientHeight));
        this.gl.viewport(this.gl.canvas.width / 2, 0, this.gl.canvas.width / 2, this.gl.canvas.height);
        this.gl.scissor(this.gl.canvas.width / 2, 0, this.gl.canvas.width / 2, this.gl.canvas.height);
        const phaseColor = Color.billiardsScheme.background;
        this.gl.clearColor(phaseColor.r, phaseColor.g, phaseColor.b, phaseColor.a);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.phaseScene.draw(this.viewShader, this.phaseCamera);
    }

    private decorateOuter(): void {
        if (this.settings.duality !== Duality.OUTER) return;
        const p = new Complex(this.outerX, this.outerY);
        const oldState = this.outerBilliardState(p);
        this.billiard.play(oldState, this.scene, this.phaseScene);
    }

    private outerBilliardState(p: Complex): OuterBilliardState<AffinePoint> | OuterBilliardState<HyperPoint> {
        switch (this.settings.plane) {
            case Plane.AFFINE:
                return new OuterBilliardState<AffinePoint>(new AffinePoint(p));
            case Plane.HYPERBOLIC:
                return new OuterBilliardState(new HyperPoint(p, this.settings.model));
            default:
                throw Error('Unknown plane');
        }
    }

    private decorateInner() {
        if (this.settings.duality !== Duality.INNER) return;
        while (this.phaseX > 1) this.phaseX -= 1;
        while (this.phaseX < 0) this.phaseX += 1;
        while (this.phaseY > 1) this.phaseY -= 1;
        while (this.phaseY < 0) this.phaseY += 1;
        let t1 = this.phaseX;
        let t2 = this.phaseY;
        if (this.settings.phaseMode === PhaseMode.ANGLE) {
            const th = this.billiard.table.tangentHeading(t1) || 0;
            t2 = this.billiard.table.intersect(t1, normalizeAngle(Math.PI * t2 + th));
        }

        const initialState: InnerBilliardState = {
            startTime: t1,
            endTime: t2,
        };

        this.billiard.play(initialState, this.scene, this.phaseScene);
    }

    override drag(oldX: number, oldY: number, newX: number, newY: number) {
        super.drag(oldX, oldY, newX, newY);
        this.noMove = false;
        const s = this.camera.getZoom();
        const w = this.canvas.clientWidth / s;
        const h = this.canvas.clientHeight / s;
        this.camera.moveCamera(new Vector3(-(newX - oldX) / w, (newY - oldY) / h, 0));
    }

    override wheel(e: WheelEvent) {
        super.wheel(e);
        const z = this.camera.getZoom() * Math.exp(e.deltaY / 500);

        this.camera.setZoom(z);
    }

    override mouseUp(x: number, y: number) {
        super.mouseUp(x, y);
        if (!this.noMove) {
            this.noMove = true;
            return;
        }
        if (this.settings.duality === Duality.INNER) {
            const lolo = new Vector4(-1, -1, 0, 1).applyMatrix4(this.phaseCamera.matrix);
            const hihi = new Vector4(1, 1, 0, 1).applyMatrix4(this.phaseCamera.matrix);

            const viewportX = (x / (this.canvas.clientWidth / 2) - 1) * 2 - 1;
            const viewportY = (y / this.canvas.clientHeight) * 2 - 1;
            const phaseX = (viewportX - lolo.x) / (hihi.x - lolo.x);
            const phaseY = 1 - (viewportY - lolo.y) / (hihi.y - lolo.y);
            if (phaseX < 0 || phaseX > 1 || phaseY < 0 || phaseY > 1 || phaseX === phaseY) return;
            this.phaseX = Math.round(100 * phaseX) / 100;
            this.phaseY = Math.round(100 * phaseY) / 100;
            this.decorateInner();
        }
        if (this.settings.duality === Duality.OUTER) {
            const lolo = new Vector4(-1, -1, 0, 1).applyMatrix4(this.camera.matrix);
            const hihi = new Vector4(1, 1, 0, 1).applyMatrix4(this.camera.matrix);

            const viewportX = (x / this.canvas.clientWidth) * 2 - 1;
            const viewportY = (1 - y / this.canvas.clientHeight) * 2 - 1;
            this.outerX = 2 * viewportX / (hihi.x - lolo.x);
            this.outerY = 2 * viewportY / (hihi.y - lolo.y);
            this.decorateOuter();
        }
    }

    override keyDown(e: KeyboardEvent) {
        const shiftMult = e.shiftKey ? 0.1 : 1;
        const ctrlMult = e.ctrlKey ? 0.01 : 1;
        const altMult = e.altKey ? 0.0001 : 1;
        const v = 1.0 / 60 * shiftMult * altMult * ctrlMult;

        if (this.settings.duality === Duality.INNER) {
            if (e.code === 'KeyJ') this.phaseX -= v;
            if (e.code === 'KeyL') this.phaseX += v;
            if (e.code === 'KeyK') this.phaseY -= v;
            if (e.code === 'KeyI') this.phaseY += v;
            this.decorateInner();
        } else if (this.settings.duality === Duality.OUTER) {
            if (e.code === 'KeyJ') this.outerX -= v;
            if (e.code === 'KeyL') this.outerX += v;
            if (e.code === 'KeyK') this.outerY -= v;
            if (e.code === 'KeyI') this.outerY += v;
            this.decorateOuter();
        }
    }
}
