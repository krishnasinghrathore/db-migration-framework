declare module 'vertica' {
  export function connect(config: any, callback: (err: any, connection?: any) => void): void;
  export default { connect };
}
