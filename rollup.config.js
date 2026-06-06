import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/display-solver-card.ts',
  output: {
    file: 'dist/display-solver.js',
    format: 'es',
    inlineDynamicImports: true,
  },
  plugins: [
    resolve(),
    typescript({ compilerOptions: { target: 'ES2022' } }),
    terser({ ecma: 2022 }),
  ],
};
