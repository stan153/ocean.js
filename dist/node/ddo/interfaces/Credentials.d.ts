export declare enum CredentialType {
    address = "address",
    credential3Box = "credential3Box"
}
export declare type CredentialAction = 'allow' | 'deny';
export interface Credential {
    type: CredentialType;
    values: string[];
}
export interface Credentials {
    allow?: Credential[];
    deny?: Credential[];
}
