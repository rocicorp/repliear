import {ensureDatabase} from '../../backend/rds';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
    await ensureDatabase();
    res.end('OK');
};
