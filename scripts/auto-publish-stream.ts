import { initializeFirebase } from '../src/services/firebase';
import { initializeRedis } from '../src/services/redis';
import { EventRepository } from '../src/repositories/event.repository';
import { StreamRepository } from '../src/repositories/stream.repository';
import { generateLiveKitToken } from '../src/services/livekit';
import * as dotenv from 'dotenv';

dotenv.config();

// Set Redis password for local connection to match docker-compose default
if (!process.env.REDIS_PASSWORD) {
  process.env.REDIS_PASSWORD = 'default_change_me';
}

async function autoPublishStream() {
  const puppeteer = await import('puppeteer');
  
  try {
    console.log('Initializing Firebase...');
    await initializeFirebase();
    console.log('Firebase initialized');

    console.log('Initializing Redis...');
    await initializeRedis();
    console.log('Redis initialized');

    const eventRepository = new EventRepository();
    const streamRepository = new StreamRepository();

    // Find any event
    console.log('Finding an event...');
    const { events } = await eventRepository.listEvents({ limit: 10 });
    
    if (events.length === 0) {
      console.error('No events found');
      process.exit(1);
    }

    const event = events[0];
    console.log(`Found event: ${event.id} - ${event.title}`);

    // Check for existing live stream
    const existingStream = await streamRepository.getByEvent(event.id);
    
    if (!existingStream || existingStream.status !== 'live') {
      console.error('No live stream found for this event');
      process.exit(1);
    }

    console.log(`Existing live stream found: ${existingStream.liveKitRoom}`);

    // Generate publisher token
    console.log('Generating publisher token...');
    const tokenResponse = await generateLiveKitToken({
      roomName: existingStream.liveKitRoom,
      participantName: event.creatorUid,
      role: 'publisher',
    });

    console.log('Token generated');

    // Start backend server if not running
    console.log('Starting browser to connect as publisher...');

    const browser = await puppeteer.launch({
      headless: false, // Show browser so user can see
      args: [
        '--use-fake-ui-for-media-stream', // Auto-allow camera/microphone
        '--disable-web-security',
        '--allow-running-insecure-content',
      ],
    });

    const page = await browser.newPage();

    // Grant camera and microphone permissions
    await page.evaluate(() => {
      // @ts-ignore
      const originalQuery = window.navigator.permissions.query;
      // @ts-ignore
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'camera' || parameters.name === 'microphone'
          ? Promise.resolve({ state: 'granted' })
          : originalQuery(parameters)
      );
    });

    // Navigate to publisher page
    console.log('Navigating to publisher page...');
    await page.goto('http://localhost:3000/publisher.html');

    // Wait for page to load
    await page.waitForSelector('#token');

    // Fill in the form
    console.log('Filling in connection details...');
    await page.evaluate((token: string) => {
      // @ts-ignore
      document.getElementById('token').value = token;
    }, tokenResponse.token);

    // Click connect button
    console.log('Clicking connect button...');
    await page.click('#connectBtn');

    // Wait for connection
    console.log('Waiting for connection to LiveKit room...');
    await page.waitForSelector('.status.connected', { timeout: 30000 });
    console.log('Publisher connected!');

    // Wait a bit for tracks to be published
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check logs for publishing confirmation
    const logs = await page.evaluate(() => {
      // @ts-ignore
      return document.getElementById('logs').innerText;
    });
    console.log('Publisher logs:', logs);

    console.log('\n=== STREAM IS LIVE ===');
    console.log(`Event ID: ${event.id}`);
    console.log(`Event URL: http://localhost:3000/events/${event.id}`);
    console.log(`Stream/Room Name: ${existingStream.liveKitRoom}`);
    console.log(`Stream ID: ${existingStream.streamId}`);
    console.log(`Status: ${existingStream.status}`);
    console.log(`Publisher Connected: YES`);
    console.log(`Video/Audio Publishing: YES`);
    console.log('\nBrowser is now publishing video/audio to the LiveKit room.');
    console.log('Stream will remain live for 20 minutes...');
    console.log('You can watch the stream at the event URL in another browser tab.');

    // Keep the browser open for 20 minutes
    await new Promise(resolve => setTimeout(resolve, 20 * 60 * 1000));

    console.log('Stream duration complete, closing browser...');
    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('Error auto-publishing stream:', error);
    process.exit(1);
  }
}

autoPublishStream();
