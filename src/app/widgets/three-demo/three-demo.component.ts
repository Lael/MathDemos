import {AfterViewInit, Component, ElementRef, OnDestroy, ViewChild} from '@angular/core';
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module'

@Component({
    selector: 'three-demo',
    templateUrl: './three-demo.component.html',
    styleUrls: ['./three-demo.component.sass']
})
export abstract class ThreeDemoComponent implements AfterViewInit, OnDestroy {
    perspectiveCamera: THREE.PerspectiveCamera;
    orthographicCamera: THREE.OrthographicCamera;
    useOrthographic = false;
    orthographicDiagonal: number = 1;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    showHelp = false;

    @ViewChild('render_container', {static: true})
    hostElement?: ElementRef;

    stats: Stats;

    private resized = true;

    keysPressed = new Map<string, boolean>();
    private old: number;

    protected constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', this.onResize.bind(this));

        const aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera = new THREE.PerspectiveCamera(36, aspect, 0.25, 2000);
        this.perspectiveCamera.position.set(0, 0, 10);

        this.orthographicCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1);
        this.orthographicCamera.position.set(0, 0, 10);

        document.addEventListener('mousedown', this.mousedown.bind(this));
        document.addEventListener('mousemove', this.mousemove.bind(this));
        document.addEventListener('mouseup', this.mouseup.bind(this));

        document.addEventListener('keydown', this.keydown.bind(this));
        document.addEventListener('keyup', this.keyup.bind(this));
        document.addEventListener('focusout', this.focusout.bind(this));
        document.addEventListener('visibilitychange', this.focusout.bind(this));

        this.stats = Stats();
        document.body.appendChild(this.stats.dom);
        this.old = Date.now();
    }

    onResize() {
        this.resized = true;
    }

    ngOnDestroy(): void {
        document.body.removeChild(this.stats.dom);
        this.hostElement?.nativeElement.removeChild(this.renderer.domElement);
        this.renderer.dispose();
    }

    mousedown(e: MouseEvent) {

    }

    mousemove(e: MouseEvent) {

    }

    mouseup(e: MouseEvent) {

    }

    keydown(e: KeyboardEvent) {
        this.keysPressed.set(e.code, true);
    }

    keyup(e: KeyboardEvent) {
        this.keysPressed.set(e.code, false);
    }

    focusout() {
        this.keysPressed.clear();
    }

    printScreen() {
        const win = window.open('', '');
        if (!win) {
            console.error('Failed to open a new window for the screenshot');
            return;
        }
        win.document.title = "Screenshot";
        const img = new Image();
        // store settings
        const oldPixelRatio = this.renderer.getPixelRatio();
        const w = this.hostElement?.nativeElement.offsetWidth || 0;
        const h = this.hostElement?.nativeElement.offsetHeight || 0;
        this.renderer.setSize(2 * w, 2 * h);
        this.renderer.render(this.scene, this.camera);
        img.src = this.renderer.domElement.toDataURL();
        win.document.body.appendChild(img);
        this.renderer.setPixelRatio(oldPixelRatio);
        this.renderer.setSize(w, h);
    }

    abstract frame(dt: number): void;

    help(): String {
        return "Placeholder!";
    }

    ngAfterViewInit(): void {
        if (!this.hostElement) {
            console.error('Missing container for renderer');
            return;
        }
        const w = this.hostElement?.nativeElement.offsetWidth || 0;
        const h = this.hostElement?.nativeElement.offsetHeight || 0;
        this.renderer.setSize(w, h);
        this.hostElement.nativeElement.appendChild(this.renderer.domElement);
        this.old = Date.now();
        this.animate();
    }

    animate() {
        if (this.resized) {
            this.resized = false;
            const w = this.hostElement?.nativeElement.offsetWidth || 0;
            const h = this.hostElement?.nativeElement.offsetHeight || 0;
            this.renderer.setSize(w, h);
            this.perspectiveCamera.aspect = w / h;
            this.perspectiveCamera.updateProjectionMatrix();
            this.updateOrthographicCamera();
        }
        this.stats.update();
        const now = Date.now();
        this.frame((now - this.old) / 1000);
        this.old = now;
        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(this.animate.bind(this));
    }

    get camera() {
        return this.useOrthographic ? this.orthographicCamera : this.perspectiveCamera;
    }

    updateOrthographicCamera() {
        const w = this.hostElement?.nativeElement.offsetWidth || 0;
        const h = this.hostElement?.nativeElement.offsetHeight || 0;

        const aspect = w / h;
        this.orthographicCamera.left = -this.orthographicDiagonal * aspect;
        this.orthographicCamera.right = this.orthographicDiagonal * aspect;
        this.orthographicCamera.top = this.orthographicDiagonal;
        this.orthographicCamera.bottom = -this.orthographicDiagonal;
        this.orthographicCamera.updateProjectionMatrix();
    }

    // onWindowResize() {
    //     this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    //     this.perspectiveCamera.updateProjectionMatrix();
    //     this.updateOrthographicCamera()
    //     this.renderer.setSize(window.innerWidth, window.innerHeight);
    // }
}
