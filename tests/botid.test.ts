import { verifyBotId } from '../lib/botid';

jest.mock('botid/server', () => ({
    checkBotId: jest.fn(),
}));

import { checkBotId } from 'botid/server';

describe('Vercel BotID Verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('permits traffic when checkBotId returns isBot: false', async () => {
        (checkBotId as jest.Mock).mockResolvedValue({ isBot: false });
        const result = await verifyBotId();
        expect(result.isBot).toBe(false);
        expect(result.response).toBeUndefined();
    });

    it('blocks traffic with 403 when checkBotId returns isBot: true', async () => {
        (checkBotId as jest.Mock).mockResolvedValue({ isBot: true });
        const result = await verifyBotId();
        expect(result.isBot).toBe(true);
        expect(result.response).toBeDefined();
        expect(result.response?.status).toBe(403);
    });

    it('fails open if checkBotId throws (local dev or non-Vercel environment)', async () => {
        (checkBotId as jest.Mock).mockRejectedValue(new Error('Missing headers'));
        const result = await verifyBotId();
        expect(result.isBot).toBe(false);
    });
});
