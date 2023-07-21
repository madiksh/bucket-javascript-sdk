import main from "./main";

declare global {
  const bucket: ReturnType<typeof main> | null;
}

let instance: ReturnType<typeof main> | null = null;

if (!instance) {
  instance = main();
}

export default instance!;
