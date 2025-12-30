import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password or secret
 */
export const hashSecret = async (plainText: string): Promise<string> => {
    return await bcrypt.hash(plainText, SALT_ROUNDS);
};

/**
 * Verify a plain text password against a hash
 */
export const verifySecret = async (plainText: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(plainText, hash);
};

/**
 * Synchronous version of hashSecret (use only when necessary)
 */
export const hashSecretSync = (plainText: string): string => {
    return bcrypt.hashSync(plainText, SALT_ROUNDS);
};

/**
 * Synchronous version of verifySecret (use only when necessary)
 */
export const verifySecretSync = (plainText: string, hash: string): boolean => {
    return bcrypt.compareSync(plainText, hash);
};
