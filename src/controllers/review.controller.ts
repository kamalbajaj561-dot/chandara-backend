import { Request, Response, NextFunction } from 'express';
import { ReviewService } from '../services/review.service';
import { ApiResponse } from '../types';

export class ReviewController {
  private reviewService: ReviewService;

  constructor(reviewService: ReviewService = new ReviewService()) {
    this.reviewService = reviewService;
  }

  async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const { rating, comment } = req.body;
      const user = req.user as any;

      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const review = await this.reviewService.createReview(
        eventId,
        user.id,
        user.displayName || user.username,
        user.avatar || user.photoURL,
        rating,
        comment
      );

      const response: ApiResponse = {
        success: true,
        data: review,
        message: 'Review created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const { limit } = req.query;

      const limitNum = limit ? parseInt(limit as string) : 50;

      const reviews = await this.reviewService.getReviewsByEvent(eventId, limitNum);

      const response: ApiResponse = {
        success: true,
        data: reviews,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getUserReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit } = req.query;
      const user = req.user as any;

      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const limitNum = limit ? parseInt(limit as string) : 50;

      const reviews = await this.reviewService.getReviewsByUser(user.id, limitNum);

      const response: ApiResponse = {
        success: true,
        data: reviews,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;
      const user = req.user as any;

      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const review = await this.reviewService.getReview(eventId, user.id);

      const response: ApiResponse = {
        success: true,
        data: review,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const { rating, comment } = req.body;
      const user = req.user as any;

      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const review = await this.reviewService.updateReview(
        reviewId,
        user.id,
        rating,
        comment
      );

      const response: ApiResponse = {
        success: true,
        data: review,
        message: 'Review updated successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reviewId } = req.params;
      const user = req.user as any;

      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await this.reviewService.deleteReview(reviewId, user.id, user.role);

      const response: ApiResponse = {
        success: true,
        message: 'Review deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getAverageRating(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { eventId } = req.params;

      const averageRating = await this.reviewService.getAverageRating(eventId);

      const response: ApiResponse = {
        success: true,
        data: { averageRating },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
