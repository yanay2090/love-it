declare module 'upng-js/UPNG.js' {
  const UPNG: {
    encode: (buffers: ArrayBuffer[], width: number, height: number, colorCount: number) => ArrayBuffer;
  };
  export default UPNG;
}

declare module '@shuding/opentype.js' {
  interface Font {
    getAdvanceWidth: (text: string, size: number, options?: { kerning?: boolean }) => number;
  }
  const opentype: {
    parse: (buffer: ArrayBuffer) => Font;
  };
  export default opentype;
}
