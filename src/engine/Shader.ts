import { gameError } from "../utils";

export default class Shader {
    public readonly program!: WebGLProgram;

    constructor(
        gl: WebGL2RenderingContext,
        vertSource: string,
        fragSource: string
    ) {
        const vertShader = Shader.load(gl, gl.VERTEX_SHADER, vertSource);
        const fragShader = Shader.load(gl, gl.FRAGMENT_SHADER, fragSource);

        const program = gl.createProgram()!;
        gl.attachShader(program, vertShader!);
        gl.attachShader(program, fragShader!);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gameError(`Unable to initialize shader: ${gl.getProgramInfoLog(program)}`);
            gl.deleteProgram(program);
            return;
        }

        // In the end we use twgl.js to generate info about the shader automatically.
        this.program = program;
    }

    // TODO: auto detection of shader params

    public static load(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gameError(`Unable to compile shader: ${gl.getShaderInfoLog(shader)}`);
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }
}
