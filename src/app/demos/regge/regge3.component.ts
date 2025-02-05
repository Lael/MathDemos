import {Component} from "@angular/core";
import {ThreeDemoComponent} from "../../widgets/three-demo/three-demo.component";
import {
    Box3,
    CylinderGeometry,
    Frustum,
    InstancedMesh,
    Matrix3,
    Matrix4,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    SphereGeometry,
    Vector2,
    Vector3,
    WebGLRenderTarget
} from "three";
import {closeEnough} from "../../../math/math-helpers";
import {cylinderMatrix} from "./regge2.component";
import {clamp} from "three/src/math/MathUtils";

const MOVEMENT_SPEED = 1;
const ANGULAR_SPEED = 1;
const ARCTIC_CIRCLE = 0.1;
const CUBE_HALF_SIDE = 1;
const CUBE_SIDE = 2 * CUBE_HALF_SIDE;

const VERTEX_RADIUS = 0.03;
const EDGE_RADIUS = 0.01;
const EDGE_SEGMENTS = 32;

const CLEAR_COLOR = 0x0a2933;
const RENDER_DEPTH = 1;

const PORTAL_SIZE = 800;

interface Regge3Node {
    index: number;
}

enum Face {
    TOP,
    BOTTOM,
    LEFT,
    RIGHT,
    FRONT,
    BACK,
}

interface Regge3Edge {
    startIndex: number;
    startFace: Face;
    endIndex: number;
    endFace: Face;
    rotation: number;
}

// Really, this is the dual graph.
class Regge3Graph {
    constructor(readonly nodes: Regge3Node[], readonly edges: Regge3Edge[]) {
    }
}

function euclideanGraph() {
    const nodes = [{index: 0}];
    const edges = [{
        startIndex: 0, startFace: Face.TOP,
        endIndex: 0, endFace: Face.BOTTOM,
        rotation: 0,
    }, {
        startIndex: 0, startFace: Face.LEFT,
        endIndex: 0, endFace: Face.RIGHT,
        rotation: 0,
    }, {
        startIndex: 0, startFace: Face.FRONT,
        endIndex: 0, endFace: Face.BACK,
        rotation: 0,
    }];
    return new Regge3Graph(nodes, edges);
}

class Regge3Portal {
    srcLowerLeft: Vector3;
    srcBottom: Vector3;
    srcLeft: Vector3;
    destLowerLeft: Vector3;
    destBottom: Vector3;
    destLeft: Vector3;
    mesh: Mesh;
    box: Box3;
    renderTarget: WebGLRenderTarget;
    geometry: PlaneGeometry;
    material: MeshBasicMaterial;

    constructor(
        srcLowerLeft: Vector3,
        srcBottom: Vector3,
        srcLeft: Vector3,
        destLowerLeft: Vector3,
        destBottom: Vector3,
        destLeft: Vector3,
    ) {
        this.srcLowerLeft = srcLowerLeft;
        this.srcBottom = srcBottom;
        this.srcLeft = srcLeft;
        this.destLowerLeft = destLowerLeft;
        this.destBottom = destBottom;
        this.destLeft = destLeft;

        this.box = new Box3(srcLowerLeft, srcLowerLeft.clone().add(srcLeft.clone().add(srcBottom)));

        this.renderTarget = new WebGLRenderTarget(PORTAL_SIZE, PORTAL_SIZE);
        this.renderTarget.texture.needsUpdate = true;

        this.geometry = new PlaneGeometry(CUBE_SIDE, CUBE_SIDE);
        this.material = new MeshBasicMaterial({color: 0x000000, map: this.renderTarget.texture});
        this.mesh = new Mesh(this.geometry, this.material);
        const center = this.srcLowerLeft.clone().addScaledVector(this.srcBottom.clone().add(this.srcLeft), 0.5);
        this.mesh.position.set(center.x, center.y, center.z);

        const normal = this.srcBottom.clone().cross(this.srcLeft).normalize();
        this.mesh.lookAt(center.clone().add(normal));

    }

    static fromSrcCorners(v1: Vector3, v2: Vector3, v3: Vector3): Regge3Portal {
        return new Regge3Portal(
            v1,
            v2.clone().sub(v1),
            v3.clone().sub(v1),
            new Vector3(-CUBE_HALF_SIDE, -CUBE_HALF_SIDE, 0),
            new Vector3(CUBE_HALF_SIDE, 0, 0),
            new Vector3(0, CUBE_HALF_SIDE, 0),
        );
    }
}

@Component({
    selector: 'regge3',
    templateUrl: '../../widgets/three-demo/three-demo.component.html',
    styleUrls: ['../../widgets/three-demo/three-demo.component.sass']
})
export class Regge3Component extends ThreeDemoComponent {
    bufferTarget = new WebGLRenderTarget(PORTAL_SIZE, PORTAL_SIZE);

    cameraTheta = 0;
    cameraPhi = 0;
    up = new Vector3(0, 1, 0);

    currentNodeIndex = 0;
    graph: Regge3Graph = euclideanGraph();
    vertexMesh: InstancedMesh;
    edgeMesh: InstancedMesh;

    portals: Regge3Portal[] = [];

    constructor() {
        super();
        this.useOrthographic = false;
        this.perspectiveCamera.fov = 80;
        this.perspectiveCamera.position.set(0, 0, 0);
        this.perspectiveCamera.updateMatrix();
        this.renderer.setClearColor(CLEAR_COLOR);
        this.renderer.autoClear = false;

        const vertexGeometry = new SphereGeometry(VERTEX_RADIUS);
        const vertexMaterial = new MeshBasicMaterial({color: 0xffffff});
        const vertices: Vector3[] = [
            new Vector3(+1, +1, +1), new Vector3(+1, +1, -1),
            new Vector3(+1, -1, +1), new Vector3(+1, -1, -1),
            new Vector3(-1, +1, +1), new Vector3(-1, +1, -1),
            new Vector3(-1, -1, +1), new Vector3(-1, -1, -1),

            new Vector3(+3, +1, +1), new Vector3(+3, +1, -1),
            new Vector3(+3, -1, +1), new Vector3(+3, -1, -1),
            new Vector3(-3, +1, +1), new Vector3(-3, +1, -1),
            new Vector3(-3, -1, +1), new Vector3(-3, -1, -1),

            new Vector3(+1, +3, +1), new Vector3(-1, +3, +1),
            new Vector3(+1, +3, -1), new Vector3(-1, +3, -1),
            new Vector3(+1, -3, +1), new Vector3(-1, -3, +1),
            new Vector3(+1, -3, -1), new Vector3(-1, -3, -1),

            new Vector3(+1, +1, +3), new Vector3(+1, -1, +3),
            new Vector3(-1, +1, +3), new Vector3(-1, -1, +3),
            new Vector3(+1, +1, -3), new Vector3(+1, -1, -3),
            new Vector3(-1, +1, -3), new Vector3(-1, -1, -3),
        ];

        let i = 0;
        this.vertexMesh = new InstancedMesh(vertexGeometry, vertexMaterial, vertices.length);
        for (let v of vertices) {
            this.vertexMesh.setMatrixAt(i, new Matrix4().makeTranslation(v.x, v.y, v.z));
            i++;
        }
        this.vertexMesh.instanceMatrix.needsUpdate = true;

        const edgeGeometry = new CylinderGeometry(EDGE_RADIUS, EDGE_RADIUS, 1, EDGE_SEGMENTS);
        const edgeMaterial = new MeshBasicMaterial({color: 0x888888});
        this.edgeMesh = new InstancedMesh(edgeGeometry, edgeMaterial, 60);
        let k = 0;
        for (let i = 0; i < vertices.length - 1; i++) {
            let p1 = vertices[i];
            for (let j = i + 1; j < vertices.length; j++) {
                let p2 = vertices[j];
                if (closeEnough(p1.distanceTo(p2), CUBE_SIDE)) {
                    this.edgeMesh.setMatrixAt(k, cylinderMatrix(p1, p2));
                    k++;
                }
            }
        }
        this.edgeMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(this.vertexMesh, this.edgeMesh);

        this.portals.push(this.createPortal(vertices[31], vertices[29], vertices[30]));

        for (let p of this.portals) {
            this.scene.add(p.mesh);
        }
    }

    createPortal(v1: Vector3, v2: Vector3, v3: Vector3): Regge3Portal {
        return Regge3Portal.fromSrcCorners(v1, v2, v3);
    }

    frame(dt: number): void {
        this.handleInput(dt);
    }

    handleInput(dt: number): void {
        let dv = new Vector3();
        if (this.keysPressed.get('KeyW')) dv.z += 1;
        if (this.keysPressed.get('KeyS')) dv.z -= 1;
        if (this.keysPressed.get('KeyD')) dv.x += 1;
        if (this.keysPressed.get('KeyA')) dv.x -= 1;
        if (this.keysPressed.get('Space')) dv.y += 1;
        if (this.keysPressed.get('ShiftLeft')) dv.y -= 1;

        let dTheta = new Vector2();
        if (this.keysPressed.get('ArrowRight')) dTheta.x -= 1;
        if (this.keysPressed.get('ArrowLeft')) dTheta.x += 1;
        if (this.keysPressed.get('ArrowDown')) dTheta.y -= 1;
        if (this.keysPressed.get('ArrowUp')) dTheta.y += 1;

        if (dTheta.length() !== 0) {
            dTheta.normalize().multiplyScalar(dt * ANGULAR_SPEED);
            this.cameraTheta += dTheta.x;
            this.cameraPhi = clamp(this.cameraPhi + dTheta.y, ARCTIC_CIRCLE - Math.PI / 2, Math.PI / 2 - ARCTIC_CIRCLE);
            let rPhi = new Matrix4().makeRotationX(this.cameraPhi);
            let rTheta = new Matrix4().makeRotationY(this.cameraTheta);
            this.camera.setRotationFromMatrix(rPhi.premultiply(rTheta));
        }

        if (dv.length() === 0) return;

        let u = this.up.clone();
        let forward = this.perspectiveCamera.getWorldDirection(new Vector3());
        let r = forward.clone().cross(u).normalize();
        let f = new Vector3(forward.x, 0, forward.z).normalize();

        let mat = new Matrix3().set(
            r.x, u.x, f.x,
            r.y, u.y, f.y,
            r.z, u.z, f.z,
        );

        let v = dv.applyMatrix3(mat);
        v.normalize().multiplyScalar(dt * MOVEMENT_SPEED);

        this.camera.position.add(v);

        if (this.camera.position.x > CUBE_HALF_SIDE) {
            this.camera.position.x -= CUBE_SIDE;
            console.log('right');
        }
        if (this.camera.position.x < -CUBE_HALF_SIDE) {
            this.camera.position.x += CUBE_SIDE;
            console.log('left');
        }
        if (this.camera.position.y > CUBE_HALF_SIDE) {
            this.camera.position.y -= CUBE_SIDE;
            console.log('top');
        }
        if (this.camera.position.y < -CUBE_HALF_SIDE) {
            this.camera.position.y += CUBE_SIDE;
            console.log('bottom');
        }
        if (this.camera.position.z > CUBE_HALF_SIDE) {
            this.camera.position.z -= CUBE_SIDE;
            console.log('back');
        }
        if (this.camera.position.z < -CUBE_HALF_SIDE) {
            this.camera.position.z += CUBE_SIDE;
            console.log('front');
        }
    }

    override render(): void {
        this.renderPortals(0, this.perspectiveCamera.clone(true));
        this.renderer.setRenderTarget(null);
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
    }

    renderPortals(depth: number, camera: PerspectiveCamera): void {
        const frustum = new Frustum();
        frustum.setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        for (let p of this.portals) {
            if (!frustum.intersectsBox(p.box)) continue;
            if (depth === 0) {
                console.log('clearing a texture');
                this.renderer.setRenderTarget(p.renderTarget);
                this.renderer.setClearColor(0xffffff);
                this.renderer.clear();
                this.renderer.render(new Scene(), this.camera);
                this.renderer.setClearColor(CLEAR_COLOR);
            } else {
                this.renderPortals(depth - 1, camera);
                // console.log('rendering to buffer target');
                this.renderer.setRenderTarget(this.bufferTarget);
                this.renderer.render(this.scene, camera);
            }
            // console.log('copying buffer target to portal');
            // console.log(depth, this.bufferTarget.texture, p.texture);
            // this.bufferTarget.texture.needsUpdate = true;
            // this.renderer.copyTextureToTexture(new Vector2(), this.bufferTarget.texture, p.texture);
        }
    }
}

function sphericalToCartesian(rho: number, theta: number, phi: number): Vector3 {
    return new Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
    ).multiplyScalar(rho);
}