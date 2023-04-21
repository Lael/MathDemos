import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {ArrowHelper, BufferGeometry, Color, LineBasicMaterial, LineSegments, Vector2, Vector3} from "three";
import {UnfoldingData} from "./billiards-unfolding.component";
import {Restriction} from "./polygon-picker.component";

type UnfoldingResult = {
    vertices: Vector2[];
    reflectedSideIndex: number;
    reflectedSideProportion: number;
    angle: number;
    nonGenericError: boolean;
};

const CLEAR_COLOR = new Color(0x123456);
const INITIAL_COLOR = new Color(0xaaffcc);
const LINE_COLOR = new Color(0xffffff);
const AXIS_COLOR = new Color(0xff0000);

const A_COLOR = 0x37a3eb;
const B_COLOR = 0xff6384;

const CAMERA_SPEED_XY = 1; // world-space units/second at z=1
const CAMERA_SPEED_Z = 0.5; // world-space units/second at z=1


@Component({
    selector: 'unfolding',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class UnfoldingComponent extends ThreeDemoComponent implements OnChanges {
    private dirty = true;

    @Input()
    vertices: Vector2[] = [new Vector2(1, -1), new Vector2(0, 1), new Vector2(-1, -1), new Vector2(0, -1.5)];

    @Input()
    iterations: number = 100;

    @Input()
    restriction: Restriction = Restriction.CONVEX;

    @Output() data = new EventEmitter<UnfoldingData[]>();

    ngOnChanges(_: SimpleChanges) {
        this.dirty = true;
    }

    constructor() {
        super();
        this.useOrthographic = true;
        this.orthographicDiagonal = 3;
        this.updateOrthographicCamera();
        this.renderer.setClearColor(CLEAR_COLOR);
    }

    private processKeyboardInput(dt: number): void {
        // Camera
        const cameraDiff = new Vector3();
        if (this.keysPressed.get('KeyW')) cameraDiff.y += 1;
        if (this.keysPressed.get('KeyA')) cameraDiff.x -= 1;
        if (this.keysPressed.get('KeyS')) cameraDiff.y -= 1;
        if (this.keysPressed.get('KeyD')) cameraDiff.x += 1;
        if (cameraDiff.length() !== 0) cameraDiff.normalize();
        this.orthographicCamera.position.x += CAMERA_SPEED_XY * dt * cameraDiff.x * this.orthographicDiagonal;
        this.orthographicCamera.position.y += CAMERA_SPEED_XY * dt * cameraDiff.y * this.orthographicDiagonal;

        let zoomDiff = 1;
        if (this.keysPressed.get('Space')) zoomDiff += CAMERA_SPEED_Z * dt;
        if (this.keysPressed.get('ShiftLeft')) zoomDiff -= CAMERA_SPEED_Z * dt;
        this.orthographicDiagonal *= zoomDiff;
        this.updateOrthographicCamera();
    }

    override frame(dt: number) {
        this.processKeyboardInput(dt);
        if (this.dirty) {
            this.dirty = false;
            this.unfold();
        }
    }

    unfold() {
        this.scene.clear();
        let vertices = this.vertices;

        const axisGeometry = new BufferGeometry().setFromPoints([new Vector2(-100, 0), new Vector2(100000, 0)]);
        this.scene.add(new LineSegments(axisGeometry, new LineBasicMaterial({color: AXIS_COLOR.getHex()})));

        const initPoints = [];
        for (let i = 0; i < vertices.length; i++) {
            initPoints.push(vertices[i], vertices[(i + 1) % vertices.length]);
        }
        const initGeometry = new BufferGeometry().setFromPoints(initPoints);
        const init = new LineSegments(initGeometry, new LineBasicMaterial({
            color: INITIAL_COLOR.getHex(),
        }));
        init.renderOrder = 10;
        this.scene.add(init);

        switch (this.restriction) {
        case Restriction.CONVEX:
            break;
        case Restriction.KITE: {
            console.log(this.vertices);
            const [v0, v1, v2, v3] = [...this.vertices];
            this.addArrow(v3, v0, A_COLOR);
            this.addArrow(v3, v2, A_COLOR);
            this.addArrow(v1, v0, B_COLOR);
            this.addArrow(v1, v2, B_COLOR);
        }
            break;
        case Restriction.CENTRAL: {
            const [v0, v1, v2, v3, v4, v5] = [...this.vertices];
            this.addArrow(v5, v0, A_COLOR);
            this.addArrow(v4, v3, B_COLOR);
            this.addArrow(v1, v0, B_COLOR);
            this.addArrow(v2, v3, A_COLOR);
        }
            break;
        }

        let graphRes = Math.pow(10,
            Math.max(0, Math.floor(Math.log10(this.iterations) - 1)));

        const data: UnfoldingData[] = [{step: 0, aSides: 0, bSides: 0, birkhoffSum: 0, distinctAngles: 0}];
        const points = [];
        let aSides = 0;
        let bSides = 0;
        let birkhoffSum = 0;
        const angles = new Set<string>();
        for (let i = 0; i < this.iterations; i++) {
            const result = this.iterate(vertices);
            if (result.nonGenericError) break;
            vertices = result.vertices;
            for (let i = 0; i < vertices.length; i++) {
                points.push(vertices[i], vertices[(i + 1) % vertices.length]);
            }
            switch (this.restriction) {
            case Restriction.KITE:
                if (result.reflectedSideIndex === 3 || result.reflectedSideIndex === 2) {
                    birkhoffSum -= Math.sign(vertices[3].y) * result.reflectedSideProportion;
                    aSides -= Math.sign(vertices[3].y);
                }
                if (result.reflectedSideIndex === 0 || result.reflectedSideIndex === 1) {
                    birkhoffSum -= Math.sign(vertices[1].y) * result.reflectedSideProportion;
                    bSides -= Math.sign(vertices[1].y);
                }
                break;
            case Restriction.CENTRAL:
                if (result.reflectedSideIndex === 5) {
                    birkhoffSum -= Math.sign(vertices[5].y) * result.reflectedSideProportion;
                    aSides -= Math.sign(vertices[5].y);
                }
                if (result.reflectedSideIndex === 3) {
                    birkhoffSum -= Math.sign(vertices[4].y) * result.reflectedSideProportion;
                    bSides -= Math.sign(vertices[4].y);
                }
                if (result.reflectedSideIndex === 0) {
                    birkhoffSum -= Math.sign(vertices[1].y) * result.reflectedSideProportion;
                    bSides -= Math.sign(vertices[1].y);
                }
                if (result.reflectedSideIndex === 2) {
                    birkhoffSum -= Math.sign(vertices[2].y) * result.reflectedSideProportion;
                    aSides -= Math.sign(vertices[2].y);
                }
                break;
            }
            angles.add(
                Math.round(result.angle * 1_000_000_000).toString()
            );
            if ((i + 1) % graphRes === 0) {
                data.push({step: i + 1, aSides, bSides, birkhoffSum, distinctAngles: angles.size});
            }
        }

        const geometry = new BufferGeometry().setFromPoints(points);

        const unfoldMat = new LineBasicMaterial({
            color: LINE_COLOR.getHex(),
        });

        this.scene.add(new LineSegments(geometry, unfoldMat));
        this.data.emit(data);
    }

    private addArrow(start: Vector2, end: Vector2, color: number) {
        const s3 = new Vector3(start.x, start.y, 0.1);
        const e3 = new Vector3(end.x, end.y, 0.1);
        const arrow = new ArrowHelper(
            e3.clone().sub(s3).normalize(),
            s3,
            s3.distanceTo(e3),
            color,
        );
        this.scene.add(arrow);
    }

    iterate(vertices: Vector2[]): UnfoldingResult {
        let allPos = true;
        let allNeg = true;
        for (let v of vertices) {
            if (v.y > 0) allNeg = false;
            if (v.y < 0) allPos = false;
            if (v.y === 0) {
                return {
                    vertices: [],
                    reflectedSideIndex: -1,
                    reflectedSideProportion: 0,
                    angle: 0,
                    nonGenericError: true,
                };
            }
        }
        if (allPos || allNeg) {
            return {
                vertices: [],
                reflectedSideIndex: -1,
                reflectedSideProportion: 0,
                angle: 0,
                nonGenericError: true,
            };
        }
        let bestX = Number.NEGATIVE_INFINITY;
        let bestI = -1;
        let bestProportion = -1;
        for (let i = 0; i < vertices.length; i++) {
            const vi = vertices[i];
            const vj = vertices[(i + 1) % vertices.length];
            if (Math.sign(vi.y) * Math.sign(vj.y) !== -1) continue;
            const proportion = Math.abs(vi.y / (vj.y - vi.y));
            const x = vi.x + proportion * (vj.x - vi.x);
            if (x > bestX) {
                bestX = x;
                bestI = i;
                bestProportion = proportion;
            }
        }
        const vi = vertices[bestI];
        const vj = vertices[(bestI + 1) % vertices.length];
        const newVertices = vertices.map(v => reflectOver(vi, vj, v));
        return {
            vertices: newVertices,
            reflectedSideIndex: bestI,
            reflectedSideProportion: bestProportion,
            angle: vj?.clone().sub(vi).angle() || 0,
            nonGenericError: false,
        };
    }
}

export function reflectOver(l1: Vector2, l2: Vector2, p: Vector2): Vector2 {
    // project l1p onto l2
    // set perp = l1p - proj
    // return p - 2 * perp
    const l1p = p.clone().sub(l1);
    const l1l2 = l2.clone().sub(l1);
    const parallel = l1l2.clone().multiplyScalar(
        l1p.dot(l1l2) / l1l2.dot(l1l2)
    );
    const perp = l1p.clone().sub(parallel);
    return p.clone().sub(perp.multiplyScalar(2));
}