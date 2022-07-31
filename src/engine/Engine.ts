import Shader from "./program/Shader";

export default class Engine {
    private shaders: Map<string, Shader> = new Map();

    private deltaTime: number = 0;
    private lastTime: number = 0;

    public constructor(
        public readonly gl: WebGL2RenderingContext
    ) {
        gl.canvas.width = gl.canvas.clientWidth;
        gl.canvas.height = gl.canvas.clientHeight;
    }

    public get delta(): number {
        return this.deltaTime;
    }

    public update(time: number) {
        time = time * 0.001;
        this.deltaTime = Math.min(time - this.lastTime, 1);
        this.lastTime = time;
    }

    // ==========
    // SHADER API
    // ==========

    public setShader(name: string, shader: Shader): Shader {
        this.unsetShader(name);
        this.shaders.set(name, shader);
        return shader;
    }

    public unsetShader(name: string): Shader | undefined {
        const shader = this.shaders.get(name);
        this.shaders.delete(name);
        shader?.clear(this.gl);
        return shader;
    }

    public getShader(name: string): Shader | undefined {
        return this.shaders.get(name);
    }
}
