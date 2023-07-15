import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    BoxGeometry,
    BufferGeometry,
    CircleGeometry,
    Color,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    Vector2
} from "three";
import {Polygon} from "./corridors.component";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {clamp} from "three/src/math/MathUtils";

const CLEAR_COLOR = new Color(0x123456);

@Component({
    selector: 'phase-picture',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class PhasePictureComponent extends ThreeDemoComponent implements OnChanges {
    @Input() polygon: Polygon | undefined = undefined;
    // @Input() length: number | undefined;
    @Input() state = new Vector2(0.123, 0.789);
    @Output() stateChange = new EventEmitter<Vector2>();
    dirty = false;

    orbitControls: OrbitControls;

    constructor() {
        super();
        this.useOrthographic = true;
        this.renderer.setClearColor(CLEAR_COLOR);
        this.orbitControls = new OrbitControls(this.orthographicCamera, this.renderer.domElement);
        this.orbitControls.enableRotate = false;

        this.renderer.domElement.onmousedown = this.selectPhase.bind(this);
        this.renderer.domElement.onmousemove = this.selectPhase.bind(this);
    }

    selectPhase(event: MouseEvent) {
        if (!(event.buttons & 1)) return;
        const bb = this.renderer.domElement.getBoundingClientRect();

        const cpx = event.clientX - bb.x;
        const cpy = event.clientY - bb.y;
        const zox = cpx / this.renderer.domElement.clientWidth;
        const zoy = 1 - cpy / this.renderer.domElement.clientHeight;

        const cx = this.orthographicCamera.left * (1 - zox) + this.orthographicCamera.right * zox;
        const cy = this.orthographicCamera.bottom * (1 - zoy) + this.orthographicCamera.top * zoy;

        const wx = cx / this.orthographicCamera.zoom + this.orthographicCamera.position.x;
        const wy = cy / this.orthographicCamera.zoom + this.orthographicCamera.position.y;

        if (Math.abs(wx) > 0.5 || Math.abs(wy) > 0.5) return;

        const rayStart = clamp(wx + 0.5, 0, 1);
        const rayEnd = clamp(wy + 0.5, 0, 1);
        this.updateState(rayStart, rayEnd)
    }

    updateState(rayStart: number, rayEnd: number) {
        if (this.polygon?.sideIndex(rayStart) === this.polygon?.sideIndex(rayEnd)) return;
        this.state = new Vector2(rayStart, rayEnd);
        this.stateChange.emit(this.state);
        this.dirty = true;
    }

    frame(dt: number): void {
        if (!this.dirty || this.polygon === undefined) return;
        this.dirty = false;
        this.scene.clear();
        const points = [];
        const boxMat = new MeshBasicMaterial({color: 0x000000});
        for (let i = 0; i <= this.polygon.n; i++) {
            points.push(new Vector2(this.polygon.vertexTimes[i], 0), new Vector2(this.polygon.vertexTimes[i], 1));
            points.push(new Vector2(0, this.polygon.vertexTimes[i]), new Vector2(1, this.polygon.vertexTimes[i]));
        }

        for (let i = 0; i < this.polygon.n; i++) {
            const t1 = this.polygon.vertexTimes[i];
            const t2 = this.polygon.vertexTimes[i + 1];
            const box = new Mesh(new BoxGeometry(t2 - t1, t2 - t1), boxMat);
            const o = (t2 + t1) / 2 - 0.5;
            box.translateX(o);
            box.translateY(o);
            box.translateZ(-2);
            this.scene.add(box);
        }

        const gridMaterial = new LineBasicMaterial({color: 0xffffff});
        const gridGeometry = new BufferGeometry().setFromPoints(points);
        const ls = new LineSegments(gridGeometry, gridMaterial);
        ls.translateX(-0.5);
        ls.translateY(-0.5);
        this.scene.add(ls);

        const disk = new Mesh(new CircleGeometry(0.01, 16), new MeshBasicMaterial({color: 0xffff00}));
        disk.position.x = this.state.x - 0.5;
        disk.position.y = this.state.y - 0.5;
        this.scene.add(disk);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.dirty = true;
    }
}