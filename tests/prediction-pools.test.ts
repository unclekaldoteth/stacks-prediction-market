import { describe, it, expect, beforeEach } from 'vitest';
import { Cl, cvToString } from '@stacks/transactions';
import { initSimnet } from '@stacks/clarinet-sdk';

// Token type constants
const TOKEN_STX = 0;
const TOKEN_USDCX = 1;

describe('Prediction Pools Contract', () => {
    let simnet: Awaited<ReturnType<typeof initSimnet>>;
    let accounts: Map<string, string>;
    let deployer: string;
    let wallet1: string;
    let wallet2: string;

    beforeEach(async () => {
        simnet = await initSimnet();
        accounts = simnet.getAccounts();
        deployer = accounts.get('deployer')!;
        wallet1 = accounts.get('wallet_1')!;
        wallet2 = accounts.get('wallet_2')!;
    });

    describe('Pool Creation', () => {
        it('should create a pool with STX', () => {
            const result = simnet.callPublicFn('prediction-pools', 'create-pool', [
                Cl.stringAscii('Will BTC hit 100k?'),
                Cl.stringAscii('Bitcoin price prediction'),
                Cl.stringAscii('Yes'),
                Cl.stringAscii('No'),
                Cl.stringAscii('Crypto'),
                Cl.uint(150),
                Cl.uint(TOKEN_STX)
            ], wallet1);

            const resultStr = cvToString(result.result);
            expect(resultStr).toContain('ok');
        });

        it('should fail USDCx pool without tokens (transfer fails)', () => {
            // Note: This test fails because wallet1 has no USDCx tokens
            // In real usage, tokens would be minted/transferred first
            const result = simnet.callPublicFn('prediction-pools', 'create-pool', [
                Cl.stringAscii('Will ETH hit 10k?'),
                Cl.stringAscii('Ethereum price prediction'),
                Cl.stringAscii('Yes'),
                Cl.stringAscii('No'),
                Cl.stringAscii('Crypto'),
                Cl.uint(200),
                Cl.uint(TOKEN_USDCX) // USDCx token type
            ], wallet1);

            const resultStr = cvToString(result.result);
            // Expect err because wallet has no USDCx tokens
            expect(resultStr).toContain('err');
        });

        it('should fail with invalid token type', () => {
            const result = simnet.callPublicFn('prediction-pools', 'create-pool', [
                Cl.stringAscii('Test Pool'),
                Cl.stringAscii('Description'),
                Cl.stringAscii('Yes'),
                Cl.stringAscii('No'),
                Cl.stringAscii('Test'),
                Cl.uint(150),
                Cl.uint(99) // Invalid token type
            ], wallet1);

            const resultStr = cvToString(result.result);
            expect(resultStr).toContain('err');
            expect(resultStr).toContain('u428'); // ERR-INVALID-TOKEN-TYPE
        });

        it('should fail with duration too short', () => {
            const result = simnet.callPublicFn('prediction-pools', 'create-pool', [
                Cl.stringAscii('Test Pool'),
                Cl.stringAscii('Description'),
                Cl.stringAscii('Yes'),
                Cl.stringAscii('No'),
                Cl.stringAscii('Test'),
                Cl.uint(10), // Too short (min 144)
                Cl.uint(TOKEN_STX)
            ], wallet1);

            const resultStr = cvToString(result.result);
            expect(resultStr).toContain('err');
            expect(resultStr).toContain('u423'); // ERR-INVALID-DURATION
        });
    });

    describe('Read-Only Functions', () => {
        it('should return correct pool count', () => {
            // Create 3 pools
            for (let i = 0; i < 3; i++) {
                simnet.callPublicFn('prediction-pools', 'create-pool', [
                    Cl.stringAscii(`Pool ${i}`),
                    Cl.stringAscii('Test'),
                    Cl.stringAscii('Yes'),
                    Cl.stringAscii('No'),
                    Cl.stringAscii('Test'),
                    Cl.uint(200),
                    Cl.uint(TOKEN_STX)
                ], wallet1);
            }

            const count = simnet.callReadOnlyFn('prediction-pools', 'get-pool-count', [], deployer);
            const countStr = cvToString(count.result);
            expect(countStr).toBe('u3');
        });

        it('should return correct min bet amount for STX', () => {
            const stxMin = simnet.callReadOnlyFn('prediction-pools', 'get-min-bet-amount', [
                Cl.uint(TOKEN_STX)
            ], deployer);
            const stxStr = cvToString(stxMin.result);
            expect(stxStr).toBe('u1000000'); // 1 STX
        });

        it('should return correct min bet amount for USDCx', () => {
            const usdcxMin = simnet.callReadOnlyFn('prediction-pools', 'get-min-bet-amount', [
                Cl.uint(TOKEN_USDCX)
            ], deployer);
            const usdcxStr = cvToString(usdcxMin.result);
            expect(usdcxStr).toBe('u1000000'); // 1 USDC
        });

        it('should retrieve pool details', () => {
            // Create a pool
            simnet.callPublicFn('prediction-pools', 'create-pool', [
                Cl.stringAscii('BTC 100k?'),
                Cl.stringAscii('Test pool'),
                Cl.stringAscii('Yes'),
                Cl.stringAscii('No'),
                Cl.stringAscii('Crypto'),
                Cl.uint(500),
                Cl.uint(TOKEN_STX)
            ], wallet1);

            const pool = simnet.callReadOnlyFn('prediction-pools', 'get-pool', [
                Cl.uint(0)
            ], deployer);

            const poolStr = cvToString(pool.result);
            expect(poolStr).toContain('some');
            expect(poolStr).toContain('BTC 100k?');
        });
    });
});
