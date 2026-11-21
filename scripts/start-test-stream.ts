import { initializeFirebase } from '../src/services/firebase';
import { initializeRedis } from '../src/services/redis';
import { EventRepository } from '../src/repositories/event.repository';
import { StreamRepository } from '../src/repositories/stream.repository';
import { StreamService } from '../src/services/stream.service';
import { generateLiveKitToken } from '../src/services/livekit';
import * as dotenv from 'dotenv';

dotenv.config();

// Set Redis password for local connection to match docker-compose default
if (!process.env.REDIS_PASSWORD) {
  process.env.REDIS_PASSWORD = 'default_change_me';
}

async function startTestStream() {
  try {
    console.log('Initializing Firebase...');
    await initializeFirebase();
    console.log('Firebase initialized');

    console.log('Initializing Redis...');
    await initializeRedis();
    console.log('Redis initialized');

    const eventRepository = new EventRepository();
    const streamRepository = new StreamRepository();
    const streamService = new StreamService();

    // Find any event (without filtering by status to avoid index requirement)
    console.log('Finding an event...');
    const { events } = await eventRepository.listEvents({ limit: 10 });
    
    if (events.length === 0) {
      console.error('No scheduled events found');
      process.exit(1);
    }

    const event = events[0];
    console.log(`Found event: ${event.id} - ${event.title}`);
    console.log(`Creator: ${event.creatorUid}`);
    console.log(`Status: ${event.status}`);

    // Check if there's already a live stream for this event
    const existingStream = await streamRepository.getByEvent(event.id);
    
    if (existingStream && existingStream.status === 'live') {
      console.log('\n=== EXISTING LIVE STREAM FOUND ===');
      console.log(`Event ID: ${event.id}`);
      console.log(`Event URL: http://localhost:3000/events/${event.id}`);
      console.log(`Stream/Room Name: ${existingStream.liveKitRoom}`);
      console.log(`Stream ID: ${existingStream.streamId}`);
      console.log(`Status: ${existingStream.status}`);
      console.log(`Publisher Connected: ${existingStream.publisherConnected}`);
      console.log('\nGenerating new publisher token for this existing stream...');
      
      const tokenResponse = await generateLiveKitToken({
        roomName: existingStream.liveKitRoom,
        participantName: event.creatorUid,
        role: 'publisher',
      });
      
      console.log(`Publisher Token: ${tokenResponse.token}`);
      console.log('\n=== INSTRUCTIONS ===');
      console.log('1. Open http://localhost:3000/publisher.html in your browser');
      console.log('2. The form is pre-filled with the room name and participant name');
      console.log('3. Paste the token above into the Token field');
      console.log('4. Click "Connect & Publish" to join the room and publish video/audio');
      console.log('5. Once connected, you can watch the stream at the event URL');
      console.log('\n=== STREAM DETAILS ===');
      console.log(`Event ID: ${event.id}`);
      console.log(`Event URL: http://localhost:3000/events/${event.id}`);
      console.log(`Stream/Room Name: ${existingStream.liveKitRoom}`);
      console.log(`Stream ID: ${existingStream.streamId}`);
      console.log(`Status: ${existingStream.status}`);
      console.log(`Publisher Connected: ${existingStream.publisherConnected}`);
      console.log('\nStream is already LIVE in the database. Connect as publisher to start publishing video/audio.');
      
      process.exit(0);
    }

    // If event is not scheduled, update it to scheduled for testing
    if (event.status !== 'scheduled') {
      console.log('Updating event status to scheduled for testing...');
      await eventRepository.update(event.id, { status: 'scheduled' });
      console.log('Event status updated');
    }

    // Start the stream
    console.log('Starting stream...');
    const { stream, token } = await streamService.startStream(event.id, event.creatorUid, false);
    console.log(`Stream started: ${stream.streamId}`);
    console.log(`Room name: ${stream.liveKitRoom}`);
    console.log(`Token: ${token.substring(0, 50)}...`);

    console.log('\n=== STREAM IS LIVE ===');
    console.log(`Event ID: ${event.id}`);
    console.log(`Event URL: http://localhost:3000/events/${event.id}`);
    console.log(`Stream/Room Name: ${stream.liveKitRoom}`);
    console.log(`Publisher Token: ${token}`);
    console.log('\nUse the publisher.html page to connect as publisher and publish video/audio');
    console.log('Stream will remain live in the database. Use stop-stream.ts to stop it when done.');
    
    // Keep the process running
    console.log('\nPress Ctrl+C to stop this script (stream will continue in database)');
    
  } catch (error) {
    console.error('Error starting test stream:', error);
    process.exit(1);
  }
}

startTestStream();
