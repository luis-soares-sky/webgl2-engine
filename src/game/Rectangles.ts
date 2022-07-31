import { Component, System } from "../engine/ECS";
import Shader from "../engine/Shader";

export class Translation extends Component {
    public constructor(
        public value: [number, number] = [0.0, 0.0],
    ) {
        super();
    }
}

export class Dimensionable extends Component {
    public constructor(
        public width: number = 0,
        public height: number = 0,
    ) {
        super();
    }
}

export class Velocity extends Component {
    public constructor(
        public value: [number, number] = [0.0, 0.0],
    ) {
        super();
    }
}

export class Rectangle extends Component {
    public constructor(
        public color: [number, number, number, number] = [0.0, 0.0, 0.0, 1.0],
        public buffer: WebGLBuffer,
        public vao: WebGLVertexArrayObject,
    ) {
        super();
    }
}

export class RectangleMover extends System {
    public componentsRequired: Set<Function> = new Set<Function>([Translation, Dimensionable, Velocity]);

    public update(delta: number, entities: Set<number>): void {
        const boundX = this.world.gl.canvas.width;
        const boundY = this.world.gl.canvas.height;

        entities.forEach((id) => {
            const entity = this.world.getComponents(id)!;
            const translation = entity.get(Translation);
            const dimensionable = entity.get(Dimensionable);
            const velocity = entity.get(Velocity);

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
        });
    }
}

export class RectangleRenderer extends System {
    public componentsRequired: Set<Function> = new Set<Function>([Translation, Dimensionable, Rectangle]);
    private shaderResolutionLocation: WebGLUniformLocation;
    private shaderColorLocation: WebGLUniformLocation;

    constructor(
        public readonly gl: WebGL2RenderingContext,
        public readonly shader: Shader,
    ) {
        super();

        this.shaderResolutionLocation = gl.getUniformLocation(shader.program, "u_resolution")!;
        this.shaderColorLocation = gl.getUniformLocation(shader.program, "u_color")!;
    }

    public update(delta: number, entities: Set<number>): void {
        // Resize and clear the canvas.
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Switch shader.
        this.gl.useProgram(this.shader.program);
        this.gl.uniform2f(this.shaderResolutionLocation, this.gl.canvas.width, this.gl.canvas.height);

        // Loop through all entities.
        entities.forEach((id) => {
            const entity = this.world.getComponents(id)!;
            const translation = entity.get(Translation);
            const dimensionable = entity.get(Dimensionable);
            const rectangle = entity.get(Rectangle);

            // Update instance uniforms
            this.gl.uniform4f(this.shaderColorLocation, rectangle.color[0], rectangle.color[1], rectangle.color[2], rectangle.color[3]);

            // Update buffer
            const x1 = translation.value[0];
            const x2 = x1 + dimensionable.width;
            const y1 = translation.value[1];
            const y2 = y1 + dimensionable.height;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, rectangle.buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
                x1, y1,
                x2, y1,
                x1, y2,
                x1, y2,
                x2, y1,
                x2, y2,
            ]), this.gl.STATIC_DRAW);

            // Render element
            this.gl.bindVertexArray(rectangle.vao);
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        });
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

export function createRectangle(gl: WebGL2RenderingContext, rectShaderPositionLocation: number) {
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

    gl.bindBuffer(gl.ARRAY_BUFFER, renderable.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), gl.STATIC_DRAW);

    gl.bindVertexArray(renderable.vao);
    gl.enableVertexAttribArray(rectShaderPositionLocation);
    gl.vertexAttribPointer(rectShaderPositionLocation, 2, gl.FLOAT, false, 0, 0);

    return [translation, dimensionable, velocity, renderable];
}
