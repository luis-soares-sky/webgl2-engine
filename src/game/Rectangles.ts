import { Component, System, World, getQuery } from "../engine/ECS";
import Engine from "../engine/Engine";
import Shader from "../engine/program/Shader";

import __SIMPLE_VS from "./rect.v.shader?raw";
import __SIMPLE_FS from "./rect.f.shader?raw";

class Translation extends Component {
    public constructor(
        public value: [number, number] = [0.0, 0.0],
    ) {
        super();
    }
}

class Dimensionable extends Component {
    public constructor(
        public width: number = 0,
        public height: number = 0,
    ) {
        super();
    }
}

class Velocity extends Component {
    public constructor(
        public value: [number, number] = [0.0, 0.0],
    ) {
        super();
    }
}

class Rectangle extends Component {
    public constructor(
        public color: [number, number, number, number] = [0.0, 0.0, 0.0, 1.0],
        public buffer: WebGLBuffer | null = null,
        public vao: WebGLVertexArrayObject | null = null,
    ) {
        super();
    }
}

class RectangleMover extends System {
    public query = getQuery(Translation, Dimensionable, Velocity);

    public update(): void {
        const boundX = this.world.engine.gl.canvas.width;
        const boundY = this.world.engine.gl.canvas.height;
        const delta = this.world.engine.delta;

        for (const [translation, dimensionable, velocity] of this.query.results) {
            translation.value[0] += velocity.value[0] * delta;
            translation.value[1] += velocity.value[1] * delta;

            if (
                (translation.value[0] <= 0 && velocity.value[0] < 0) ||
                (translation.value[0] + dimensionable.width >= boundX && velocity.value[0] > 0)
            )
                velocity.value[0] *= -1;

            if (
                (translation.value[1] <= 0 && velocity.value[1] < 0) ||
                (translation.value[1] + dimensionable.height >= boundY && velocity.value[1] > 0)
            )
                velocity.value[1] *= -1;
        }
    }
}

class RectangleRenderer extends System {
    public query = getQuery(Translation, Dimensionable, Rectangle);

    public update(): void {
        const gl = this.world.engine.gl;
        const shader = this.world.engine.getShader("rect");
        const shaderResolutionLocation = gl.getUniformLocation(shader!.program, "u_resolution")!;
        const shaderColorLocation = gl.getUniformLocation(shader!.program, "u_color")!;

        // Resize and clear the canvas.
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Switch shader.
        gl.useProgram(shader!.program);
        gl.uniform2f(shaderResolutionLocation, gl.canvas.width, gl.canvas.height);

        // Loop through all entities.
        for (const [translation, dimensionable, rectangle] of this.query.results) {
            // Update instance uniforms
            gl.uniform4f(shaderColorLocation, rectangle.color[0], rectangle.color[1], rectangle.color[2], rectangle.color[3]);

            // Update buffer
            const x1 = translation.value[0];
            const x2 = x1 + dimensionable.width;
            const y1 = translation.value[1];
            const y2 = y1 + dimensionable.height;
            gl.bindBuffer(gl.ARRAY_BUFFER, rectangle.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                x1, y1,
                x2, y1,
                x1, y2,
                x1, y2,
                x2, y1,
                x2, y2,
            ]), gl.STATIC_DRAW);

            // Render element
            gl.bindVertexArray(rectangle.vao);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    }
}

function randomInt(range: number): number {
    return Math.floor(Math.random() * range);
}

function randomRange(min: number, max: number): number {
    return min + randomInt(max - min);
}

function randomSign(): number {
    return (Math.random() >= 0.5 ? 1 : -1);
}

function createRectangle(engine: Engine) {
    const gl = engine.gl;
    const shader = engine.getShader("rect");
    const shaderPositionLocation = gl.getAttribLocation(shader!.program, "a_position");

    // Create all components.
    const translation = new Translation([
        randomInt(gl.canvas.width),
        randomInt(gl.canvas.height),
    ]);
    const dimensionable = new Dimensionable(
        randomRange(50, 250),
        randomRange(50, 250),
    );
    const velocity = new Velocity([
        randomRange(100, 200) * randomSign(),
        randomRange(100, 200) * randomSign(),
    ]);
    const renderable = new Rectangle(
        [
            Math.random(),
            Math.random(),
            Math.random(),
            1,
        ],
        gl.createBuffer()!,
        gl.createVertexArray()!,
    );

    // TODO: this should probably be handled by a system?
    gl.bindBuffer(gl.ARRAY_BUFFER, renderable.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), gl.STATIC_DRAW);
    gl.bindVertexArray(renderable.vao);
    gl.enableVertexAttribArray(shaderPositionLocation);
    gl.vertexAttribPointer(shaderPositionLocation, 2, gl.FLOAT, false, 0, 0);

    return [translation, dimensionable, velocity, renderable];
}

export default function setup(engine: Engine, world: World) {
    // Create shader and add the "a_position" attribute to it.
    engine.setShader("rect", new Shader(engine.gl, __SIMPLE_VS, __SIMPLE_FS));

    // Create systems.
    world.addSystem(new RectangleMover());
    world.addSystem(new RectangleRenderer());

    // Create entities and components.
    for (let i = 0; i < 50; i++) {
        const entity = world.addEntity();
        createRectangle(engine).forEach((component) => {
            world.addComponent(entity, component);
        });
    }
}
