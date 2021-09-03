import { DDO } from '../ddo/DDO';
import { Credentials, CredentialType, CredentialAction } from '../ddo/interfaces/Credentials';
export declare function checkCredentialExist(credentials: Credentials, credentialType: CredentialType, credentialAction: CredentialAction): boolean;
export declare function removeCredentialDetail(ddo: DDO, credentialType: CredentialType, credentialAction: CredentialAction): DDO;
export declare function updateCredentialDetail(ddo: DDO, credentialType: CredentialType, list: string[], credentialAction: CredentialAction): DDO;
export declare function addCredentialDetail(ddo: DDO, credentialType: CredentialType, list: string[], credentialAction: CredentialAction): DDO;
