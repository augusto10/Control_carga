declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [key: string]: any;
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    nbf?: number;
    iat?: number;
    jti?: string;
  }

  export interface SignOptions {
    algorithm?: string;
    keyid?: string;
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    subject?: string;
    issuer?: string;
    jwtid?: string;
    mutatePayload?: boolean;
    noTimestamp?: boolean;
    header?: object;
    encoding?: string;
  }

  export interface VerifyOptions {
    algorithms?: string[];
    audience?: string | RegExp | (string | RegExp)[];
    clockTolerance?: number;
    complete?: boolean;
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    jwtid?: string;
    nonce?: string;
    subject?: string;
    clockTimestamp?: number;
    maxAge?: string | number;
  }

  export interface DecodeOptions {
    complete?: boolean;
    json?: boolean;
  }

  export class JsonWebTokenError extends Error {
    name: 'JsonWebTokenError';
    message: string;
    constructor(message: string);
  }

  export class TokenExpiredError extends JsonWebTokenError {
    name: 'TokenExpiredError';
    expiredAt: Date;
    constructor(message: string, expiredAt: Date);
  }

  export class NotBeforeError extends JsonWebTokenError {
    name: 'NotBeforeError';
    date: Date;
    constructor(message: string, date: Date);
  }

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: SignOptions
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: VerifyOptions
  ): string | JwtPayload;

  export function decode(
    token: string,
    options?: DecodeOptions & { complete: true }
  ): null | { header: any; payload: JwtPayload; signature: string };
  export function decode(
    token: string,
    options?: DecodeOptions
  ): null | JwtPayload | string;
}
