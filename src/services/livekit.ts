import { RoomServiceClient, AccessToken } from 'livekit-server-sdk';
import config from '../config';
import logger from '../utils/logger';
import { LiveKitTokenRequest, LiveKitTokenResponse } from '../types';

const livekitClient = new RoomServiceClient(
  config.livekit.url,
  config.livekit.apiKey,
  config.livekit.apiSecret
);

export async function generateLiveKitToken(
  request: LiveKitTokenRequest
): Promise<LiveKitTokenResponse> {
  try {
    // Set token expiration based on role (shorter for security)
    const ttl = request.role === 'publisher' ? 3600 : 7200; // 1 hour for publishers, 2 hours for subscribers

    const token = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
      identity: request.participantName,
      name: request.displayName,
      ttl,
    });

    token.addGrant({
      room: request.roomName,
      roomJoin: true,
      canPublish: request.role === 'publisher' || request.role === 'moderator',
      canSubscribe: true,
      canPublishData: request.role === 'moderator',
    });

    const jwt = await token.toJwt();

    logger.info(`Generated LiveKit token for room ${request.roomName}, participant ${request.participantName}, role ${request.role}`);

    // Convert HTTP URL to WebSocket URL for client connection
    const wsUrl = config.livekit.url.replace('http://', 'ws://').replace('https://', 'wss://');

    return {
      token: jwt,
      url: wsUrl,
    };
  } catch (error) {
    logger.error('Failed to generate LiveKit token:', error);
    throw error;
  }
}

export async function createRoom(roomName: string): Promise<void> {
  try {
    await livekitClient.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 10000,
    });
    logger.info(`Created LiveKit room: ${roomName}`);
  } catch (error) {
    logger.error('Failed to create LiveKit room:', error);
    throw error;
  }
}

export async function deleteRoom(roomName: string): Promise<void> {
  try {
    await livekitClient.deleteRoom(roomName);
    logger.info(`Deleted LiveKit room: ${roomName}`);
  } catch (error) {
    logger.error('Failed to delete LiveKit room:', error);
    throw error;
  }
}

export async function listRooms(): Promise<any[]> {
  try {
    const rooms = await livekitClient.listRooms();
    return rooms;
  } catch (error) {
    logger.error('Failed to list LiveKit rooms:', error);
    throw error;
  }
}

export async function getRoomParticipants(roomName: string): Promise<any[]> {
  try {
    const participants = await livekitClient.listParticipants(roomName);
    return participants;
  } catch (error) {
    logger.error('Failed to get room participants:', error);
    throw error;
  }
}

export async function removeParticipant(roomName: string, participantId: string): Promise<void> {
  try {
    await livekitClient.removeParticipant(roomName, participantId);
    logger.info(`Removed participant ${participantId} from room ${roomName}`);
  } catch (error) {
    logger.error('Failed to remove participant:', error);
    throw error;
  }
}

export async function muteParticipant(
  roomName: string,
  participantId: string,
  trackSid: string
): Promise<void> {
  try {
    await livekitClient.mutePublishedTrack(roomName, participantId, trackSid, true);
    logger.info(`Muted participant ${participantId} in room ${roomName}`);
  } catch (error) {
    logger.error('Failed to mute participant:', error);
    throw error;
  }
}
