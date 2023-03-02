import {HyperbolicModel, HyperGeodesic, HyperPoint} from "../hyperbolic/hyperbolic";
import {Drawable} from "../../graphics/shapes/drawable";
import {Scene} from "../../graphics/scene";
import {AffineGeodesic, AffinePoint, GeodesicLike, PointLike} from "../geometry/geometry";
import {closeEnough, normalizeAngle} from "../math-helpers";
import {affineFourthCircle, BilliardTable} from "./tables";
import {AffinePolygonTable} from "./affine-polygon-table";
import {HyperbolicPolygonTable} from "./hyperbolic-polygon-table";
import {EllipseTable} from "./ellipse-table";
import {StadiumTable} from "./stadium-table";
import {Color} from "../../graphics/shapes/color";
import {Complex} from "../complex";
import {Path, PathSpec} from "../../graphics/shapes/path";
import {PointCloud, PointCloudSpec} from "../../graphics/shapes/point-cloud";
import {Polygon2D, PolygonSpec} from "../../graphics/shapes/polygon2D";
import {Matrix4, Vector4} from "three";
import {MultiArc, MultiArcSpec} from "../../graphics/shapes/multi-path";
import {Disk, DiskSpec} from "../../graphics/shapes/disk";

export enum Flavor {
    REGULAR = 'regular',
    SYMPLECTIC = 'symplectic',
}

export enum Duality {
    INNER = 'inner',
    OUTER = 'outer',
}

export enum Plane {
    AFFINE = 'affine',
    HYPERBOLIC = 'hyperbolic',
}

export enum TableShape {
    POLYGON = 'polygon',
    ELLIPSE = 'ellipse',
    STADIUM = 'stadium',
}

export enum PhaseMode {
    OFF = 'off',
    TIME = 'time',
    ANGLE = 'angle',
}

export interface PolygonDetails {
    vertexCount: number,
    radius: number,
}

export interface EllipseDetails {
    eccentricity: number,
}

export interface StadiumDetails {
    length: number,
    radius: number,
}

export interface BilliardsSettings {
    // Type of billiard
    flavor: Flavor;
    duality: Duality,
    plane: Plane,

    // Table parameters
    tableShape: TableShape,
    polygonDetails: PolygonDetails,
    ellipseDetails: EllipseDetails,
    stadiumDetails: StadiumDetails,

    // Drawing settings
    model: HyperbolicModel;
    iterations: number;
    phaseMode: PhaseMode;
    unfold: boolean;
    debug: boolean;
}

export const DEFAULT_BILLIARDS_SETTINGS = {
    flavor: Flavor.SYMPLECTIC,
    duality: Duality.OUTER,
    plane: Plane.AFFINE,

    tableShape: TableShape.POLYGON,
    polygonDetails: {vertexCount: 3, radius: 1},
    ellipseDetails: {eccentricity: 0.75},
    stadiumDetails: {length: 1, radius: 0.5},

    model: HyperbolicModel.POINCARE,
    iterations: 1000,
    phaseMode: PhaseMode.ANGLE,
    unfold: true,
    debug: false,
};

export class InnerBilliardState {
    constructor(readonly startTime: number, readonly endTime: number) {
    }
}

export class OuterBilliardState<Point extends PointLike> {
    constructor(readonly point: Point) {
    }
}


type BilliardState = InnerBilliardState | OuterBilliardState<any>;

interface OuterBilliardTable {
}

export abstract class Billiard<Point extends PointLike, Geodesic extends GeodesicLike<Point>> {
    readonly table!: BilliardTable<Point, Geodesic>;

    constructor(protected readonly settings: BilliardsSettings, protected readonly gl: WebGL2RenderingContext) {
    }

    abstract play(state: BilliardState, scene: Scene, phaseScene: Scene): void;

    abstract nextState(state: BilliardState): BilliardState;

    abstract prevState(state: BilliardState): BilliardState;

    abstract populateScene(scene: Scene): void;
}

export class AffineBilliard extends Billiard<AffinePoint, AffineGeodesic> {
    override readonly table: BilliardTable<AffinePoint, AffineGeodesic>;
    protected readonly tableDrawable: Drawable;
    private debugDrawables: Drawable[] = [];
    private preimageCloud?: PointCloud;

    constructor(settings: BilliardsSettings, gl: WebGL2RenderingContext) {
        super(settings, gl);
        this.table = createAffineTable(settings, gl);
        const model = this.settings.plane === Plane.HYPERBOLIC ? this.settings.model : undefined;
        this.tableDrawable = this.table.toDrawable(
            gl,
            model,
            settings.duality === Duality.OUTER ? Color.billiardsScheme.tableFill : undefined,
            Color.billiardsScheme.tableBorder);
        // if (this.table instanceof AffinePolygonTable
        //     && this.settings.duality === Duality.OUTER
        //     && this.settings.flavor === Flavor.SYMPLECTIC) {
        //     const preimages: Complex[] = [];
        //     const vertices = this.table.vertices;
        //     const n = vertices.length;
        //     for (let i = 0; i < n; i++) {
        //         const v1 = vertices[(i + 1) % n].resolve();
        //         const v2 = vertices[i].resolve();
        //         const diff = v2.minus(v1);
        //         const ray: Complex[] = [];
        //         const length = 50;
        //         const scale = 100.0;
        //         for (let j = 1; j < length * scale; j++) {
        //             const c = v2.plus(diff.scale(j / scale));
        //             ray.push(c);
        //             // const cc = new Complex(-c.real, c.imag);
        //             // for (let k = 0; k < n; k++) {
        //             //     ray.push(c.times(Complex.polar(1, k * 2 * Math.PI / n)));
        //             //     ray.push(cc.times(Complex.polar(1, k * 2 * Math.PI / n)));
        //             // }
        //         }
        //         preimages.push(...ray);
        //         for (let j = 0; j < 100; j++) {
        //             try {
        //                 for (let k = 0; k < ray.length; k++) {
        //                     ray[k] = this.prevOuterState(new OuterBilliardState<AffinePoint>(new AffinePoint(ray[k]))).point.resolve();
        //                 }
        //                 preimages.push(...ray);
        //             } catch (e) {
        //                 console.error(e);
        //                 break;
        //             }
        //         }
        //     }
        //     this.preimageCloud = new PointCloud(this.gl, new PointCloudSpec(preimages, 0, Color.WHITE), 0);
        // }
    }

    play(state: BilliardState, scene: Scene, phaseScene: Scene) {
        if (this.settings.duality === Duality.INNER) {
            this.playInner(state as InnerBilliardState, scene, phaseScene);
        } else if (this.settings.duality === Duality.OUTER) {
            this.playOuter(state as OuterBilliardState<AffinePoint>, scene);
        }
    }

    private phase(t1: number, t2: number): Complex {
        if (this.settings.phaseMode === PhaseMode.TIME) {
            return new Complex(2 * t1 - 1, 2 * t2 - 1);
        } else if (this.settings.phaseMode === PhaseMode.ANGLE) {
            const th = this.table.tangentHeading(t1) || 0;
            const h = normalizeAngle(this.table.point(t1).heading(this.table.point(t2)), th) - th;
            return new Complex(2 * t1 - 1, 2 * h / Math.PI - 1);
        }
        throw Error('Unknown phase mode');
    }

    private playInner(state: InnerBilliardState,
                      scene: Scene,
                      phaseScene: Scene): void {
        let t1 = state.startTime;
        let t2 = state.endTime;
        const vertices: Complex[] = [this.table.point(t1).resolve(), this.table.point(t2).resolve()];
        const phases: Complex[] = [];
        const times: number[] = [t2];
        phases.push(this.phase(t1, t2));
        let periodic = false;
        for (let i = 0; i < this.settings.iterations - 1; i++) {
            const newState = this.nextInnerState(new InnerBilliardState(t1, t2));
            t1 = newState.startTime;
            t2 = newState.endTime;
            vertices.push(this.table.point(t2).resolve());
            const phase = this.phase(t1, t2);
            phases.push(phase);
            times.push(t2);
            if (closeEnough(phase.distance(phases[0]), 0)) {
                periodic = true;
                break;
            }
        }

        const pc = periodic ? Color.billiardsScheme.periodicTrajectory : Color.billiardsScheme.trajectory;

        scene.clear();
        if (this.settings.unfold && this.table instanceof AffinePolygonTable) {
            const tablePaths: Complex[][] = [];
            const path: Complex[] = [vertices[0]];

            let m = new Matrix4();
            let i = 0;
            for (i = 0; i < times.length - 1; i++) {
                const v1 = new Vector4(vertices[i + 1].x, vertices[i + 1].y, 0, 1).applyMatrix4(m);
                const c1 = new Complex(v1.x, v1.y);
                path.push(c1);
                const tablePath: Complex[] = [];
                for (let i = 0; i < this.table.vertices.length + 1; i++) {
                    const c = this.table.vertices[i % this.table.vertices.length].resolve();
                    const v = new Vector4(c.x, c.y, 0, 1);
                    const mv = v.applyMatrix4(m);
                    tablePath.push(new Complex(mv.x, mv.y));
                }
                tablePaths.push(tablePath);
                const h = this.table.tangentHeading(times[i]);
                if (h === undefined) break;
                const tp = vertices[i + 1].plus(Complex.polar(1, h));
                const v2 = new Vector4(tp.x, tp.y, 0, 1).applyMatrix4(m);
                const c2 = new Complex(v2.x, v2.y);
                const t1 = new Matrix4().makeTranslation(-v1.x, -v1.y, 0);
                const t2 = new Matrix4().makeTranslation(v1.x, v1.y, 0);
                const r1 = new Matrix4().makeRotationZ(-c1.heading(c2));
                const r2 = new Matrix4().makeRotationZ(+c1.heading(c2));
                const ref = new Matrix4().makeScale(1, -1, 1);

                m = t2.multiply(r2.multiply(ref.multiply(r1.multiply(t1.multiply(m)))));
            }
            scene.set('table',
                new MultiArc(this.gl,
                    new MultiArcSpec(
                        tablePaths,
                        BilliardTable.TABLE_BORDER,
                        Color.ZERO,
                        BilliardTable.TABLE_BORDER_THICKNESS
                    )));
            scene.set('chords', new Path(this.gl, new PathSpec(
                path, pc, periodic ? BilliardTable.PATH_THICKNESS : 0,
            ), 0.7));
        } else {
            scene.set('table', this.tableDrawable);
            scene.set('chords', new Path(this.gl, new PathSpec(
                vertices, pc, periodic ? BilliardTable.PATH_THICKNESS : 0,
            ), 0.7));
        }

        phaseScene.clear();
        // phaseScene.set('phase-0', new Disk(this.gl, new DiskSpec(phases[0], 0.01, Color.scheme.accent, undefined), 0.1));
        phaseScene.set(`phases`, new PointCloud(this.gl, new PointCloudSpec(
            phases, 0.002, pc
        ), 0.2));

        const phaseBox = new Polygon2D(this.gl, new PolygonSpec([
            new Complex(-1, -1),
            new Complex(1, -1),
            new Complex(1, 1),
            new Complex(-1, 1),
            new Complex(-1, -1),
        ], Color.ZERO, Color.billiardsScheme.tableBorder, BilliardTable.TABLE_BORDER_THICKNESS), 0.7);
        phaseScene.set('phasebox', phaseBox);
        if (this.settings.phaseMode === PhaseMode.ANGLE) return;
        // let i = 1;
        // for (let interval of this.billiard.table.flatIntervals()) {
        //     if (interval.length !== 2) throw Error('nonsense interval');
        //     const lo = interval[0] * 2 - 1;
        //     const hi = interval[1] * 2 - 1;
        //     this.phaseScene.set(`phase_interval${i}`, new Polygon2D(this.gl, new PolygonSpec([
        //         new Complex(lo, lo),
        //         new Complex(hi, lo),
        //         new Complex(hi, hi),
        //         new Complex(lo, hi),
        //         new Complex(lo, lo),
        //     ], Color.scheme.accent, undefined), 0.6))
        //     i += 1;
        // }
    }

    private playInnerUnfold(state: InnerBilliardState,
                            scene: Scene,
                            phaseScene: Scene): void {

    }

    private playOuter(state: OuterBilliardState<AffinePoint>, scene: Scene): void {
        this.debugDrawables = [];
        let periodic = false;
        const vertices: Complex[] = [state.point.resolve()];
        let oldState = state;
        const iters = this.settings.debug ? 1 : this.settings.iterations - 1;
        for (let i = 0; i < iters; i++) {
            try {
                const newState = this.nextOuterState(oldState);
                const vertex = newState.point.resolve(this.settings.model);
                vertices.push(vertex);
                oldState = newState;
                if (closeEnough(vertex.distance(vertices[0]), 0)) {
                    periodic = true;
                    break;
                }
            } catch (e) {
                console.warn(e);
                break;
            }
        }
        // const segments = this.billiard.table.preimages()
        //     .map(g => (g as GeodesicLike<any>).segment(this.settings.model).interpolate(1));
        // this.scene.set('preimages', new MultiArc(this.gl, new MultiArcSpec(segments, Color.scheme.border), 0.6));
        // const debug = this.billiard.table.debugGeodesics
        //     .map(g => (g as GeodesicLike<any>).segment(this.settings.model).interpolate(1));
        // for (let i = 0; i < debug.length; i++) {
        //     this.scene.set(`debug${i}`, new Path(this.gl, new PathSpec(debug[i], Color.scheme.accent, 0.01), 0.1));
        // }
        // scene.clear();
        if (this.settings.flavor !== Flavor.SYMPLECTIC || this.settings.debug) scene.clear();
        scene.set('table', this.tableDrawable);
        const pc = periodic ? Color.billiardsScheme.periodicTrajectory : Color.billiardsScheme.trajectory;
        if (this.settings.flavor !== Flavor.SYMPLECTIC) {
            scene.set('path', new Path(this.gl, new PathSpec(
                vertices, pc,
            ), 0.5));
        }
        scene.set(`cloud${state.point.resolve().x}${state.point.resolve().y}`,
            new PointCloud(this.gl, new PointCloudSpec(vertices, 0, Color.MANGO), 0.5));
        // scene.set('start',
        //     new Disk(this.gl, new DiskSpec(state.point.resolve(), 0.01, Color.GREEN, Color.GREEN), 0.1));
        // scene.set('preimage',
        //     new Disk(this.gl, new DiskSpec(this.prevOuterState(state).point.resolve(), 0.01, Color.RED, Color.RED), 0.1));
        // console.log(this.table.singularities);

        // for (let i = 0; i < this.table.singularities.length; i++) {
        //     scene.set(`singularity_${i}`, this.table.singularities[i]);
        // }
        if (this.settings.debug) {
            for (let i = 0; i < this.debugDrawables.length; i++) {
                scene.set(`debug${i}`, this.debugDrawables[i]);
            }
        }
        if (this.preimageCloud) scene.set('preimage_cloud', this.preimageCloud);
    }

    nextState(state: BilliardState): BilliardState {
        switch (this.settings.duality) {
            case Duality.INNER:
                if (!(state instanceof InnerBilliardState)) {
                    throw Error('Inner billiards requires an inner billiard state');
                }
                return this.nextInnerState(state);
            case Duality.OUTER:
                if (!(state instanceof OuterBilliardState)) {
                    throw Error('Inner billiards requires an inner billiard state');
                }
                return this.nextOuterState(state);
        }
        throw Error('NYI');
    }

    private nextInnerState(state: InnerBilliardState): InnerBilliardState {
        // p1 -> p2 becomes p2 -> p3
        const p1 = this.table.point(state.startTime);
        const p2 = this.table.point(state.endTime);
        const th = this.table.tangentHeading(state.endTime);
        if (th === undefined) throw new Error('Inner billiards: undefined tangent');
        const h21 = p2.heading(p1);
        let t3 = 0;

        switch (this.settings.flavor) {
            case Flavor.REGULAR:
                const h23 = reflectHeading(h21, th);
                t3 = this.table.intersect(state.endTime, h23);
                return new InnerBilliardState(state.endTime, t3);
            case Flavor.SYMPLECTIC:
                t3 = this.table.intersect(state.startTime, th!)
                return new InnerBilliardState(state.endTime, t3);
            // Cast parallel geodesic
            // const p3 = this.table.intersect(state.startTime, h2);
            // return new InnerBilliardState(state.endTime, t3);
            default:
                throw Error('Unknown billiards flavor');
        }
    }

    private nextOuterState(state: OuterBilliardState<AffinePoint>): OuterBilliardState<AffinePoint> {
        switch (this.settings.flavor) {
            case Flavor.REGULAR:
                return new OuterBilliardState<AffinePoint>(this.table.rightInvertPoint(state.point));
            case Flavor.SYMPLECTIC:
                const g1 = this.table.rightTangentGeodesic(state.point);
                const g2 = this.table.leftTangentGeodesic(state.point);
                const circle = affineFourthCircle(state.point, g1, g2.reverse(), g1.p2);
                const g3 = this.table.rightTangentGeodesic(circle);
                const intersection = g1.intersect(g3);
                if (intersection === undefined) throw Error('No intersection');
                if (this.settings.debug) {
                    this.debugDrawables.push(Path.fromSegment(this.gl, g1.segment(), Color.MANGO));
                    this.debugDrawables.push(Path.fromSegment(this.gl, g2.segment(), Color.MANGO));
                    this.debugDrawables.push(Path.fromSegment(this.gl, g3.segment(), Color.MANGO));
                    this.debugDrawables.push(new Disk(this.gl, new DiskSpec(circle.center.resolve(), circle.radius, undefined, Color.MANGO)));
                    this.debugDrawables.push(new Disk(this.gl, new DiskSpec(state.point.resolve(), 0.01, Color.GREEN, Color.GREEN)));
                    this.debugDrawables.push(new Disk(this.gl, new DiskSpec(intersection.resolve(), 0.01, Color.GREEN, Color.GREEN)));
                }
                return new OuterBilliardState<AffinePoint>(intersection);
            default:
                throw Error('Unknown billiards flavor');
        }
    }

    prevState(state: BilliardState): BilliardState {
        switch (this.settings.duality) {
            case Duality.INNER:
                if (!(state instanceof InnerBilliardState)) {
                    throw Error('Inner billiards requires an inner billiard state');
                }
                return this.prevInnerState(state);
            case Duality.OUTER:
                if (!(state instanceof OuterBilliardState)) {
                    throw Error('Inner billiards requires an inner billiard state');
                }
                return this.prevOuterState(state);
        }
        throw Error('NYI');
    }

    private prevInnerState(state: InnerBilliardState): InnerBilliardState {
        // p1 -> p2 becomes p2 -> p3
        const p2 = this.table.point(state.startTime);
        const p1 = this.table.point(state.endTime);
        const th = this.table.tangentHeading(state.startTime);
        if (th === undefined) throw new Error('Inner billiards: undefined tangent');
        const h21 = p2.heading(p1);

        switch (this.settings.flavor) {
            case Flavor.REGULAR:
                const h23 = reflectHeading(h21, th);
                const t3 = this.table.intersect(state.startTime, h23);
                return new InnerBilliardState(t3, state.startTime);
            case Flavor.SYMPLECTIC:
                throw new Error('NYI');
            default:
                throw Error('Unknown billiards flavor');
        }
    }

    private prevOuterState(state: OuterBilliardState<AffinePoint>): OuterBilliardState<AffinePoint> {
        switch (this.settings.flavor) {
            case Flavor.REGULAR:
                return new OuterBilliardState<AffinePoint>(this.table.leftInvertPoint(state.point));
            case Flavor.SYMPLECTIC:
                const g1 = this.table.leftTangentGeodesic(state.point);
                const g2 = this.table.rightTangentGeodesic(state.point);
                const circle = affineFourthCircle(state.point, g1, g2.reverse(), g1.p2);
                const g3 = this.table.leftTangentGeodesic(circle);
                // this.debugDrawables.push(Path.fromSegment(this.gl, g1.segment(), Color.MANGO));
                // this.debugDrawables.push(Path.fromSegment(this.gl, g2.segment(), Color.MANGO));
                // this.debugDrawables.push(Path.fromSegment(this.gl, g3.segment(), Color.MANGO));
                // this.debugDrawables.push(new Disk(this.gl, new DiskSpec(circle.center.resolve(), circle.radius, undefined, Color.YELLOW)));
                const intersection = g1.intersect(g3);
                if (intersection === undefined) throw Error('No intersection');
                return new OuterBilliardState<AffinePoint>(intersection);
            default:
                throw Error('Unknown billiards flavor');
        }
    }

    shouldRedraw() {
        return false;
    }

    populateScene(scene: Scene) {
        scene.set('table', this.tableDrawable);
    }
}

export class HyperbolicBilliard extends Billiard<HyperPoint, HyperGeodesic> {
    override readonly table: BilliardTable<HyperPoint, HyperGeodesic>;
    protected readonly tableDrawable: Drawable;

    constructor(settings: BilliardsSettings, gl: WebGL2RenderingContext) {
        super(settings, gl);
        this.table = createHyperbolicTable(settings, gl);
        const model = this.settings.plane === Plane.HYPERBOLIC ? this.settings.model : undefined;
        this.tableDrawable = this.table.toDrawable(
            gl,
            model,
            settings.duality === Duality.OUTER ? Color.billiardsScheme.tableFill : undefined,
            Color.billiardsScheme.tableBorder);
    }

    play(state: BilliardState, scene: Scene, phaseScene: Scene) {

    }

    nextState(state: BilliardState): BilliardState {
        throw Error('NYI');
    }

    prevState(state: BilliardState): BilliardState {
        throw Error('NYI');
    }

    populateScene(scene: Scene): void {
        throw Error('NYI');
    }

}

export function createBilliard(settings: BilliardsSettings, gl: WebGL2RenderingContext): Billiard<any, any> {
    switch (settings.plane) {
        case Plane.AFFINE:
            return new AffineBilliard(settings, gl);
        case Plane.HYPERBOLIC:
            return new HyperbolicBilliard(settings, gl);
        default:
            throw Error('Unknown plane type');
    }
}

function createAffineTable(settings: BilliardsSettings, gl: WebGL2RenderingContext): BilliardTable<AffinePoint, AffineGeodesic> {
    switch (settings.tableShape) {
        case TableShape.POLYGON:
            switch (settings.plane) {
                case Plane.AFFINE:
                    return new AffinePolygonTable(settings, gl);
                case Plane.HYPERBOLIC:
                    throw Error('Wrong plane type for call');
                default:
                    throw Error('Unknown plane type');
            }
        case TableShape.ELLIPSE:
            return new EllipseTable(settings);
        case TableShape.STADIUM:
            return new StadiumTable(settings);
        default:
            throw Error('Unknown table shape');
    }
}

function createHyperbolicTable(settings: BilliardsSettings, gl: WebGL2RenderingContext): BilliardTable<HyperPoint, HyperGeodesic> {
    switch (settings.tableShape) {
        case TableShape.POLYGON:
            switch (settings.plane) {
                case Plane.AFFINE:
                    throw Error('Wrong plane type for call');
                case Plane.HYPERBOLIC:
                    return new HyperbolicPolygonTable(settings);
                default:
                    throw Error('Unknown plane type');
            }
        case TableShape.ELLIPSE:
            throw Error('Wrong plane type for call');
        case TableShape.STADIUM:
            throw Error('Wrong plane type for call');
        default:
            throw Error('Unknown table shape');
    }
}

function reflectHeading(incident: number, tangent: number): number {
    return normalizeAngle(tangent + Math.PI - (incident - tangent));
}