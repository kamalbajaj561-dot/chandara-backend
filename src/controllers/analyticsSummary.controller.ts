import { Request, Response, NextFunction } from 'express';
import { analyticsSummaryService } from '../services/analyticsSummary.service';
import { AppError } from '../middleware/errorHandler';

const DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

/** Parses ?startDate&endDate (ISO). Defaults to the last 30 days; rejects invalid/inverted/oversized ranges. */
export function parseRange(query: Request['query']): { start: Date; end: Date } {
  const end = query.endDate ? new Date(String(query.endDate)) : new Date();
  const start = query.startDate ? new Date(String(query.startDate)) : new Date(end.getTime() - 30 * DAY);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new AppError('Invalid date range', 400);
  if (start > end) throw new AppError('startDate must be before endDate', 400);
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * DAY) throw new AppError(`Date range cannot exceed ${MAX_RANGE_DAYS} days`, 400);
  return { start, end };
}

const handler =
  (fn: (req: Request, range: { start: Date; end: Date }) => Promise<unknown>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await fn(req, parseRange(req.query));
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

export const getCreatorSummary = handler((req, range) => analyticsSummaryService.getCreatorSummary(req.params.id, range));
export const getEventSummary = handler((req, range) => analyticsSummaryService.getEventSummary(req.params.id, range));
export const getPlatformSummary = handler((_req, range) => analyticsSummaryService.getPlatformSummary(range));
