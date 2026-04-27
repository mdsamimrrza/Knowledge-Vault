declare module "jsonwebtoken" {
  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string,
    options?: { expiresIn?: string | number }
  ): string;
}
