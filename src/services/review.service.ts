import { ReviewRepository } from '../repositories/review.repository';
import { EventService } from './event.service';
import { AppError } from '../middleware/errorHandler';
import { Review } from '../types';

export class ReviewService {
  private reviewRepository: ReviewRepository;
  private eventService: EventService;

  constructor(
    reviewRepository?: ReviewRepository,
    eventService?: EventService
  ) {
    this.reviewRepository = reviewRepository || new ReviewRepository();
    this.eventService = eventService || new EventService();
  }

  async createReview(
    eventId: string,
    userId: string,
    userName: string,
    userAvatar: string | undefined,
    rating: number,
    comment: string
  ): Promise<Review> {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    // Validate comment
    if (!comment || comment.trim().length === 0) {
      throw new AppError('Comment cannot be empty', 400);
    }

    // Check if event exists
    await this.eventService.getEvent(eventId);

    // Check if user already reviewed this event
    const existingReview = await this.reviewRepository.findByEventIdAndUserId(eventId, userId);
    if (existingReview) {
      throw new AppError('You have already reviewed this event', 400);
    }

    const reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'> = {
      eventId,
      userId,
      userName,
      userAvatar,
      rating,
      comment,
    };

    return await this.reviewRepository.create(reviewData);
  }

  async getReviewsByEvent(eventId: string, limit = 50): Promise<Review[]> {
    // Check if event exists
    await this.eventService.getEvent(eventId);

    return await this.reviewRepository.findByEventId(eventId, limit);
  }

  async getReviewsByUser(userId: string, limit = 50): Promise<Review[]> {
    return await this.reviewRepository.findByUserId(userId, limit);
  }

  async getReview(eventId: string, userId: string): Promise<Review | null> {
    return await this.reviewRepository.findByEventIdAndUserId(eventId, userId);
  }

  async updateReview(
    reviewId: string,
    userId: string,
    rating?: number,
    comment?: string
  ): Promise<Review> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppError('Review not found', 404);
    }

    if (review.userId !== userId) {
      throw new AppError('You can only update your own review', 403);
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    // Validate comment if provided
    if (comment !== undefined && comment.trim().length === 0) {
      throw new AppError('Comment cannot be empty', 400);
    }

    const updateData: Partial<Review> = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    const updatedReview = await this.reviewRepository.update(reviewId, updateData);
    if (!updatedReview) {
      throw new AppError('Failed to update review', 500);
    }

    return updatedReview;
  }

  async deleteReview(reviewId: string, userId: string, userRole: string): Promise<void> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppError('Review not found', 404);
    }

    // Only allow deletion by the review author or admins
    if (review.userId !== userId && userRole !== 'administrator') {
      throw new AppError('You can only delete your own review', 403);
    }

    const deleted = await this.reviewRepository.delete(reviewId);
    if (!deleted) {
      throw new AppError('Failed to delete review', 500);
    }
  }

  async getAverageRating(eventId: string): Promise<number> {
    // Check if event exists
    await this.eventService.getEvent(eventId);

    return await this.reviewRepository.getAverageRating(eventId);
  }
}

export const reviewService = new ReviewService();
