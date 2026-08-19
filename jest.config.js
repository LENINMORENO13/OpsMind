/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  testEnvironment: "node",
  transform: {
    // Procesa tanto .ts/.tsx como .js/.jsx con ts-jest
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        useESM: false,
        diagnostics: false,
        tsconfig: {
          allowJs: true,
          module: "CommonJS",
          moduleResolution: "node",
        },
      },
    ],
  },
  moduleNameMapper: {
    // Resuelve las importaciones con extensión .js hacia archivos .ts o .js
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  moduleFileExtensions: ["ts", "js", "json", "node"],
};